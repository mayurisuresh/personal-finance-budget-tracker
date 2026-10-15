import { Router, Response } from 'express';
import { db } from '../db/store.js';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';
import { seedUserDefaults } from '../services/seedService.js';

const router = Router();
router.use(authMiddleware);

// GET ALL WORKSPACES FOR USER
router.get('/', (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.user._id;
  const workspaces = db.find('workspaces', w =>
    w.ownerId === userId || w.members?.some((m: any) => m.userId === userId || m.email === req.user.email)
  );
  res.json({ success: true, workspaces, activeWorkspaceId: req.user.activeWorkspaceId });
});

// CREATE NEW WORKSPACE
router.post('/', (req: AuthenticatedRequest, res: Response): void => {
  try {
    const { name, type, currency } = req.body;
    if (!name) {
      res.status(400).json({ success: false, message: 'Workspace name is required.' });
      return;
    }

    const newWorkspace = db.insert('workspaces', {
      name: name.trim(),
      type: type || 'personal',
      ownerId: req.user._id,
      currency: currency || req.user.currency || 'INR',
      members: [
        {
          userId: req.user._id,
          role: 'owner',
          email: req.user.email,
          status: 'active',
        },
      ],
    });

    // Seed defaults for this workspace
    seedUserDefaults(req.user._id, newWorkspace._id, req.user.financialProfile);

    res.status(201).json({ success: true, workspace: newWorkspace });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to create workspace', error: err.message });
  }
});

// SWITCH ACTIVE WORKSPACE
router.post('/switch', (req: AuthenticatedRequest, res: Response): void => {
  const { workspaceId } = req.body;
  const workspace = db.findById('workspaces', workspaceId);
  if (!workspace) {
    res.status(404).json({ success: false, message: 'Workspace not found.' });
    return;
  }

  db.updateById('users', req.user._id, { activeWorkspaceId: workspaceId });
  res.json({ success: true, activeWorkspaceId: workspaceId, workspace });
});

// INVITE MEMBER (For Family/Business)
router.post('/:id/invite', (req: AuthenticatedRequest, res: Response): void => {
  const workspace = db.findById('workspaces', req.params.id);
  if (!workspace) {
    res.status(404).json({ success: false, message: 'Workspace not found.' });
    return;
  }

  if (workspace.ownerId !== req.user._id) {
    res.status(403).json({ success: false, message: 'Only workspace owner can invite members.' });
    return;
  }

  const { email, role } = req.body;
  if (!email) {
    res.status(400).json({ success: false, message: 'Member email is required.' });
    return;
  }

  const members = workspace.members || [];
  if (members.some((m: any) => m.email === email.toLowerCase().trim())) {
    res.status(400).json({ success: false, message: 'User is already invited or a member of this workspace.' });
    return;
  }

  members.push({
    email: email.toLowerCase().trim(),
    role: role || 'editor',
    status: 'invited',
    invitedAt: new Date().toISOString(),
  });

  db.updateById('workspaces', workspace._id, { members });
  res.json({ success: true, message: `Invitation sent to ${email}`, members });
});

export default router;
