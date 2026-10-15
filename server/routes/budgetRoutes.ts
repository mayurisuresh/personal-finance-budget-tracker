import { Router, Response } from 'express';
import { db } from '../db/store.js';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

// GET BUDGETS WITH DYNAMIC SPENT & UTILIZATION
router.get('/', (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.user._id;
  const workspaceId = req.workspaceId;

  const budgets = db.find('budgets', b => b.userId === userId && (!workspaceId || b.workspaceId === workspaceId));
  const allTxs = db.find('transactions', t => t.userId === userId && (!workspaceId || t.workspaceId === workspaceId));

  const now = new Date();
  const currentMonth = now.toISOString().slice(0, 7);
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysRemaining = daysInMonth - now.getDate();

  const enriched = budgets.map(b => {
    const limit = Number(b.limitAmount) || 0;
    // Transactions matching this budget category within this month (or budget date range)
    const matchingTxs = allTxs.filter(t => {
      if (t.type !== 'expense') return false;
      if (b.category && t.category !== b.category) return false;
      if (b.startDate && new Date(t.date).getTime() < new Date(b.startDate).getTime()) return false;
      if (b.endDate && new Date(t.date).getTime() > new Date(b.endDate).getTime()) return false;
      if (!b.startDate && !b.endDate) {
        return t.date && t.date.startsWith(currentMonth);
      }
      return true;
    });

    const spent = matchingTxs.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const remaining = Math.max(0, limit - spent);
    const percentage = limit > 0 ? Math.round((spent / limit) * 100) : 0;

    let status = 'within';
    if (spent > limit) {
      status = 'exceeded';
    } else if (percentage >= 80) {
      status = 'approaching';
    }

    return {
      ...b,
      spent: Math.round(spent * 100) / 100,
      remaining: Math.round(remaining * 100) / 100,
      percentage,
      daysRemaining,
      status,
      transactionCount: matchingTxs.length,
    };
  });

  res.json({ success: true, budgets: enriched });
});

// CREATE BUDGET
router.post('/', (req: AuthenticatedRequest, res: Response): void => {
  try {
    const { name, category, limitAmount, currency, period, startDate, endDate, alertThresholds } = req.body;
    const limit = Number(limitAmount);
    if (!limit || limit <= 0) {
      res.status(400).json({ success: false, message: 'Valid budget limit amount is required.' });
      return;
    }

    const newBudget = db.insert('budgets', {
      userId: req.user._id,
      workspaceId: req.workspaceId,
      name: name?.trim() || `${category || 'Overall'} Budget`,
      category: category || '',
      limitAmount: Math.round(limit * 100) / 100,
      currency: currency || req.user.currency || 'INR',
      period: period || 'monthly',
      startDate: startDate || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(),
      endDate: endDate || new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString(),
      alertThresholds: alertThresholds || [50, 80, 100],
    });

    res.status(201).json({ success: true, budget: newBudget });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to create budget', error: err.message });
  }
});

// UPDATE BUDGET
router.patch('/:id', (req: AuthenticatedRequest, res: Response): void => {
  const budget = db.findById('budgets', req.params.id);
  if (!budget || budget.userId !== req.user._id) {
    res.status(404).json({ success: false, message: 'Budget not found.' });
    return;
  }

  const updates: any = {};
  ['name', 'category', 'limitAmount', 'currency', 'period', 'startDate', 'endDate', 'alertThresholds'].forEach(k => {
    if (req.body[k] !== undefined) {
      if (k === 'limitAmount') updates[k] = Math.round(Number(req.body[k]) * 100) / 100;
      else updates[k] = req.body[k];
    }
  });

  const updated = db.updateById('budgets', budget._id, updates);
  res.json({ success: true, budget: updated });
});

// DELETE BUDGET
router.delete('/:id', (req: AuthenticatedRequest, res: Response): void => {
  const budget = db.findById('budgets', req.params.id);
  if (!budget || budget.userId !== req.user._id) {
    res.status(404).json({ success: false, message: 'Budget not found.' });
    return;
  }

  db.deleteById('budgets', budget._id);
  res.json({ success: true, message: 'Budget deleted.' });
});

export default router;
