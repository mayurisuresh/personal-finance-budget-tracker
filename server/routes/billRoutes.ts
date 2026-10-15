import { Router, Response } from 'express';
import { db } from '../db/store.js';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

// GET ALL BILLS
router.get('/', (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.user._id;
  const workspaceId = req.workspaceId;

  const bills = db.find('bills', b => b.userId === userId && (!workspaceId || b.workspaceId === workspaceId));
  const now = new Date();

  const enriched = bills.map(b => {
    let dynamicStatus = b.status;
    let daysUntilDue = 0;

    if (b.nextDueDate && b.status !== 'paused' && b.status !== 'paid') {
      const due = new Date(b.nextDueDate);
      daysUntilDue = Math.ceil((due.getTime() - now.getTime()) / (1000 * 3600 * 24));
      if (daysUntilDue < 0) {
        dynamicStatus = 'overdue';
      } else {
        dynamicStatus = 'upcoming';
      }
    }

    return {
      ...b,
      status: dynamicStatus,
      daysUntilDue,
    };
  });

  res.json({ success: true, bills: enriched });
});

// CREATE BILL
router.post('/', (req: AuthenticatedRequest, res: Response): void => {
  try {
    const {
      name,
      amount,
      currency,
      category,
      frequency,
      nextDueDate,
      reminderDaysBefore,
      autoRecordTransaction,
    } = req.body;

    if (!name || !amount) {
      res.status(400).json({ success: false, message: 'Bill name and amount are required.' });
      return;
    }

    const newBill = db.insert('bills', {
      userId: req.user._id,
      workspaceId: req.workspaceId,
      name: name.trim(),
      amount: Number(amount),
      currency: currency || req.user.currency || 'INR',
      category: category || 'Utilities',
      frequency: frequency || 'monthly',
      nextDueDate: nextDueDate || new Date().toISOString(),
      reminderDaysBefore: Number(reminderDaysBefore) || 3,
      status: 'upcoming',
      autoRecordTransaction: Boolean(autoRecordTransaction),
    });

    res.status(201).json({ success: true, bill: newBill });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to create bill', error: err.message });
  }
});

// MARK BILL AS PAID & LINK TRANSACTION
router.post('/:id/pay', (req: AuthenticatedRequest, res: Response): void => {
  const bill = db.findById('bills', req.params.id);
  if (!bill || bill.userId !== req.user._id) {
    res.status(404).json({ success: false, message: 'Bill not found.' });
    return;
  }

  const { accountId, paymentDate, recordTransaction = true } = req.body;
  const payDate = paymentDate || new Date().toISOString();

  // Optionally record real transaction
  let linkedTx = null;
  if (recordTransaction) {
    const numAmount = Number(bill.amount) || 0;
    linkedTx = db.insert('transactions', {
      userId: req.user._id,
      workspaceId: req.workspaceId,
      type: 'expense',
      amount: numAmount,
      currency: bill.currency || req.user.currency || 'INR',
      category: bill.category || 'Utilities',
      date: payDate,
      accountId: accountId || null,
      paymentMethod: 'netbanking',
      description: `Bill payment: ${bill.name}`,
      tags: ['bill_payment', bill.frequency],
      recurringBillId: bill._id,
    });

    if (accountId) {
      const acc = db.findById('accounts', accountId);
      if (acc) {
        const newBal = (Number(acc.balance) || 0) - numAmount;
        db.updateById('accounts', acc._id, { balance: Math.round(newBal * 100) / 100 });
      }
    }
  }

  // Advance nextDueDate based on frequency
  let nextDate = new Date(bill.nextDueDate || Date.now());
  if (bill.frequency === 'daily') nextDate.setDate(nextDate.getDate() + 1);
  else if (bill.frequency === 'weekly') nextDate.setDate(nextDate.getDate() + 7);
  else if (bill.frequency === 'yearly') nextDate.setFullYear(nextDate.getFullYear() + 1);
  else nextDate.setMonth(nextDate.getMonth() + 1); // default monthly

  const updatedBill = db.updateById('bills', bill._id, {
    status: 'paid',
    lastPaidDate: payDate,
    nextDueDate: nextDate.toISOString(),
  });

  res.json({
    success: true,
    message: `Bill "${bill.name}" marked as paid. Next due date: ${nextDate.toISOString().slice(0, 10)}`,
    bill: updatedBill,
    transaction: linkedTx,
  });
});

// UPDATE BILL
router.patch('/:id', (req: AuthenticatedRequest, res: Response): void => {
  const bill = db.findById('bills', req.params.id);
  if (!bill || bill.userId !== req.user._id) {
    res.status(404).json({ success: false, message: 'Bill not found.' });
    return;
  }

  const updates: any = {};
  ['name', 'amount', 'currency', 'category', 'frequency', 'nextDueDate', 'reminderDaysBefore', 'status', 'autoRecordTransaction'].forEach(k => {
    if (req.body[k] !== undefined) {
      if (k === 'amount') updates[k] = Number(req.body[k]);
      else updates[k] = req.body[k];
    }
  });

  const updated = db.updateById('bills', bill._id, updates);
  res.json({ success: true, bill: updated });
});

// DELETE BILL
router.delete('/:id', (req: AuthenticatedRequest, res: Response): void => {
  const bill = db.findById('bills', req.params.id);
  if (!bill || bill.userId !== req.user._id) {
    res.status(404).json({ success: false, message: 'Bill not found.' });
    return;
  }

  db.deleteById('bills', bill._id);
  res.json({ success: true, message: 'Bill deleted.' });
});

export default router;
