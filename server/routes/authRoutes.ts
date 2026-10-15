import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db/store.js';
import { generateToken, authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';
import { seedUserDefaults } from '../services/seedService.js';

const router = Router();

// REGISTER
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, financialProfile, financialPriorities, currency } = req.body;

    if (!email || !password) {
      res.status(400).json({ success: false, message: 'Email and password are required.' });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = db.findOne('users', u => u.email === normalizedEmail);
    if (existing) {
      res.status(409).json({ success: false, message: 'An account with this email already exists.' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create user
    const newUser = db.insert('users', {
      name: name?.trim() || 'Valued User',
      email: normalizedEmail,
      passwordHash,
      financialProfile: financialProfile || 'Salaried Employee',
      financialPriorities: financialPriorities || ['Track income', 'Monitor daily expenses', 'Save money'],
      currency: currency || 'INR',
      preferences: {
        theme: 'light',
        accentColor: '#2563EB',
        currency: currency || 'INR',
        defaultDateRange: 'month',
        visibleCards: ['balance', 'cashflow', 'income', 'expenses', 'budgets', 'savings', 'bills', 'categories'],
        alertThresholds: { warn: 80, danger: 100 },
      },
    });

    // Create Default Personal Workspace
    const workspace = db.insert('workspaces', {
      name: `${newUser.name.split(' ')[0]}'s Finances`,
      type: 'personal',
      ownerId: newUser._id,
      currency: newUser.currency || 'INR',
      members: [
        {
          userId: newUser._id,
          role: 'owner',
          email: newUser.email,
          status: 'active',
        },
      ],
    });

    // If business owner, also create a Business Workspace
    if (newUser.financialProfile === 'Business Owner' || newUser.financialProfile === 'Small Shop Owner') {
      db.insert('workspaces', {
        name: `${newUser.name.split(' ')[0]}'s Business Operations`,
        type: 'business',
        ownerId: newUser._id,
        currency: newUser.currency || 'INR',
        members: [
          {
            userId: newUser._id,
            role: 'owner',
            email: newUser.email,
            status: 'active',
          },
        ],
      });
    }

    // Attach active workspace
    db.updateById('users', newUser._id, { activeWorkspaceId: workspace._id });
    newUser.activeWorkspaceId = workspace._id;

    // Seed defaults
    seedUserDefaults(newUser._id, workspace._id, newUser.financialProfile);

    // Generate JWT
    const token = generateToken({ userId: newUser._id, email: newUser.email });

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    const { passwordHash: _, ...safeUser } = newUser;
    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token,
      user: safeUser,
      workspace,
    });
  } catch (err: any) {
    console.error('Registration error:', err);
    res.status(500).json({ success: false, message: 'Failed to create account', error: err.message });
  }
});

// LOGIN
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ success: false, message: 'Email and password are required.' });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = db.findOne('users', u => u.email === normalizedEmail);

    if (!user) {
      res.status(401).json({ success: false, message: 'Invalid email or password.' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ success: false, message: 'Invalid email or password.' });
      return;
    }

    const token = generateToken({ userId: user._id, email: user.email });

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    const activeWorkspace = user.activeWorkspaceId ? db.findById('workspaces', user.activeWorkspaceId) : null;
    const { passwordHash: _, ...safeUser } = user;

    res.json({
      success: true,
      message: 'Logged in successfully',
      token,
      user: safeUser,
      workspace: activeWorkspace,
    });
  } catch (err: any) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Login failed', error: err.message });
  }
});

// LOGOUT
router.post('/logout', (req: Request, res: Response): void => {
  res.clearCookie('token');
  res.json({ success: true, message: 'Logged out successfully' });
});

// CURRENT USER / ME
router.get('/me', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  const user = req.user;
  const workspaces = db.find('workspaces', w => w.ownerId === user._id || w.members?.some((m: any) => m.userId === user._id));
  const activeWorkspace = db.findById('workspaces', user.activeWorkspaceId) || workspaces[0] || null;

  const { passwordHash: _, ...safeUser } = user;
  res.json({
    success: true,
    user: safeUser,
    workspaces,
    activeWorkspace,
  });
});

// UPDATE PROFILE
router.patch('/profile', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const { name, financialProfile, financialPriorities, currency } = req.body;
    const updates: any = {};
    if (name !== undefined) updates.name = name.trim();
    if (financialProfile !== undefined) updates.financialProfile = financialProfile;
    if (financialPriorities !== undefined) updates.financialPriorities = financialPriorities;
    if (currency !== undefined) updates.currency = currency;

    const updatedUser = db.updateById('users', req.user._id, updates);
    const { passwordHash: _, ...safeUser } = updatedUser;
    res.json({ success: true, message: 'Profile updated successfully', user: safeUser });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to update profile', error: err.message });
  }
});

// UPDATE PREFERENCES
router.patch('/preferences', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const { theme, accentColor, currency, defaultDateRange, visibleCards, alertThresholds } = req.body;
    const currentPrefs = req.user.preferences || {};
    const newPrefs = {
      ...currentPrefs,
      ...(theme !== undefined && { theme }),
      ...(accentColor !== undefined && { accentColor }),
      ...(currency !== undefined && { currency }),
      ...(defaultDateRange !== undefined && { defaultDateRange }),
      ...(visibleCards !== undefined && { visibleCards }),
      ...(alertThresholds !== undefined && { alertThresholds }),
    };

    const updatedUser = db.updateById('users', req.user._id, { preferences: newPrefs });
    const { passwordHash: _, ...safeUser } = updatedUser;
    res.json({ success: true, message: 'Preferences updated successfully', preferences: newPrefs, user: safeUser });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to update preferences', error: err.message });
  }
});

// CHANGE PASSWORD
router.post('/change-password', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      res.status(400).json({ success: false, message: 'Current and new password are required.' });
      return;
    }

    const isMatch = await bcrypt.compare(currentPassword, req.user.passwordHash);
    if (!isMatch) {
      res.status(400).json({ success: false, message: 'Incorrect current password.' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);
    db.updateById('users', req.user._id, { passwordHash });

    res.json({ success: true, message: 'Password changed successfully.' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to change password', error: err.message });
  }
});

export default router;
