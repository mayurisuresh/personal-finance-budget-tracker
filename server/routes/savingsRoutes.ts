import { Router, Response } from 'express';
import { db } from '../db/store.js';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

// GET ALL SAVINGS GOALS
router.get('/', (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.user._id;
  const workspaceId = req.workspaceId;
  const goals = db.find('savingsGoals', g => g.userId === userId && (!workspaceId || g.workspaceId === workspaceId));

  const now = new Date();
  const enriched = goals.map(g => {
    const target = Number(g.targetAmount) || 0;
    const current = Number(g.currentAmount) || 0;
    const progressPct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
    const remaining = Math.max(0, target - current);

    let daysLeft = 0;
    let monthlySuggested = 0;
    if (g.targetDate) {
      const deadline = new Date(g.targetDate);
      daysLeft = Math.max(0, Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 3600 * 24)));
      const monthsLeft = Math.max(1, Math.ceil(daysLeft / 30));
      monthlySuggested = Math.round(remaining / monthsLeft);
    }

    return {
      ...g,
      progressPct,
      remaining,
      daysLeft,
      monthlySuggested,
    };
  });

  res.json({ success: true, goals: enriched });
});

// CREATE SAVINGS GOAL
router.post('/', (req: AuthenticatedRequest, res: Response): void => {
  try {
    const { name, targetAmount, currentAmount, currency, targetDate, category, notes } = req.body;
    if (!name || !targetAmount) {
      res.status(400).json({ success: false, message: 'Goal name and target amount are required.' });
      return;
    }

    const newGoal = db.insert('savingsGoals', {
      userId: req.user._id,
      workspaceId: req.workspaceId,
      name: name.trim(),
      targetAmount: Number(targetAmount),
      currentAmount: Number(currentAmount) || 0,
      currency: currency || req.user.currency || 'INR',
      targetDate: targetDate || new Date(Date.now() + 180 * 86400000).toISOString(),
      category: category || 'General Savings',
      notes: notes || '',
      contributions: currentAmount > 0 ? [{
        id: 'c_' + Date.now(),
        amount: Number(currentAmount),
        date: new Date().toISOString(),
        note: 'Initial deposit',
      }] : [],
    });

    res.status(201).json({ success: true, goal: newGoal });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to create savings goal', error: err.message });
  }
});

// UPDATE SAVINGS GOAL
router.patch('/:id', (req: AuthenticatedRequest, res: Response): void => {
  const goal = db.findById('savingsGoals', req.params.id);
  if (!goal || goal.userId !== req.user._id) {
    res.status(404).json({ success: false, message: 'Savings goal not found.' });
    return;
  }

  const updates: any = {};
  ['name', 'targetAmount', 'currentAmount', 'currency', 'targetDate', 'category', 'notes'].forEach(k => {
    if (req.body[k] !== undefined) {
      if (k === 'targetAmount' || k === 'currentAmount') updates[k] = Number(req.body[k]);
      else updates[k] = req.body[k];
    }
  });

  const updated = db.updateById('savingsGoals', goal._id, updates);
  res.json({ success: true, goal: updated });
});

// ADD CONTRIBUTION
router.post('/:id/contributions', (req: AuthenticatedRequest, res: Response): void => {
  const goal = db.findById('savingsGoals', req.params.id);
  if (!goal || goal.userId !== req.user._id) {
    res.status(404).json({ success: false, message: 'Savings goal not found.' });
    return;
  }

  const { amount, note, accountId } = req.body;
  const numAmount = Number(amount);
  if (!numAmount || numAmount <= 0) {
    res.status(400).json({ success: false, message: 'Valid contribution amount is required.' });
    return;
  }

  // Deduct from account if account specified
  if (accountId) {
    const acc = db.findById('accounts', accountId);
    if (acc) {
      const newBal = (Number(acc.balance) || 0) - numAmount;
      db.updateById('accounts', acc._id, { balance: Math.round(newBal * 100) / 100 });
    }
  }

  const contributions = goal.contributions || [];
  const contribution = {
    id: 'c_' + Date.now(),
    amount: numAmount,
    date: new Date().toISOString(),
    note: note || 'Goal deposit',
    accountId: accountId || null,
  };
  contributions.push(contribution);

  const newCurrent = (Number(goal.currentAmount) || 0) + numAmount;
  const updated = db.updateById('savingsGoals', goal._id, {
    currentAmount: Math.round(newCurrent * 100) / 100,
    contributions,
  });

  res.json({ success: true, goal: updated, contribution });
});

// DELETE SAVINGS GOAL
router.delete('/:id', (req: AuthenticatedRequest, res: Response): void => {
  const goal = db.findById('savingsGoals', req.params.id);
  if (!goal || goal.userId !== req.user._id) {
    res.status(404).json({ success: false, message: 'Savings goal not found.' });
    return;
  }

  db.deleteById('savingsGoals', goal._id);
  res.json({ success: true, message: 'Savings goal deleted.' });
});

export default router;
