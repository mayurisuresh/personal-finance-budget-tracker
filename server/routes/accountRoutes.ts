import { Router, Response } from 'express';
import { db } from '../db/store.js';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

// GET ALL ACCOUNTS
router.get('/', (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.user._id;
  const workspaceId = req.workspaceId;
  const accounts = db.find('accounts', a => a.userId === userId && (!workspaceId || a.workspaceId === workspaceId));
  res.json({ success: true, accounts });
});

// CREATE ACCOUNT
router.post('/', (req: AuthenticatedRequest, res: Response): void => {
  try {
    const { name, type, balance, currency, institution, accountNumberLast4, isDefault } = req.body;
    if (!name) {
      res.status(400).json({ success: false, message: 'Account name is required.' });
      return;
    }

    const newAccount = db.insert('accounts', {
      userId: req.user._id,
      workspaceId: req.workspaceId,
      name: name.trim(),
      type: type || 'bank',
      balance: Number(balance) || 0,
      currency: currency || req.user.currency || 'INR',
      institution: institution || '',
      accountNumberLast4: accountNumberLast4 || '',
      isDefault: Boolean(isDefault),
    });

    res.status(201).json({ success: true, account: newAccount });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to create account', error: err.message });
  }
});

// UPDATE ACCOUNT
router.patch('/:id', (req: AuthenticatedRequest, res: Response): void => {
  try {
    const account = db.findById('accounts', req.params.id);
    if (!account || account.userId !== req.user._id) {
      res.status(404).json({ success: false, message: 'Account not found.' });
      return;
    }

    const updates: any = {};
    ['name', 'type', 'balance', 'currency', 'institution', 'accountNumberLast4', 'isDefault'].forEach(k => {
      if (req.body[k] !== undefined) {
        if (k === 'balance') updates[k] = Number(req.body[k]);
        else updates[k] = req.body[k];
      }
    });

    const updated = db.updateById('accounts', account._id, updates);
    res.json({ success: true, account: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to update account', error: err.message });
  }
});

// DELETE ACCOUNT
router.delete('/:id', (req: AuthenticatedRequest, res: Response): void => {
  const account = db.findById('accounts', req.params.id);
  if (!account || account.userId !== req.user._id) {
    res.status(404).json({ success: false, message: 'Account not found.' });
    return;
  }

  db.deleteById('accounts', account._id);
  res.json({ success: true, message: 'Account deleted.' });
});

export default router;
