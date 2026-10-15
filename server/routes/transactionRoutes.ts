import { Router, Response } from 'express';
import { db } from '../db/store.js';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

// GET TRANSACTIONS with filtering, pagination, search, sorting
router.get('/', (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.user._id;
  const workspaceId = req.workspaceId;

  let txs = db.find('transactions', t => t.userId === userId && (!workspaceId || t.workspaceId === workspaceId));

  const {
    type,
    category,
    accountId,
    startDate,
    endDate,
    search,
    sortBy = 'date',
    sortOrder = 'desc',
    page = '1',
    limit = '25',
  } = req.query;

  if (type) {
    txs = txs.filter(t => t.type === type);
  }

  if (category) {
    txs = txs.filter(t => t.category === category);
  }

  if (accountId) {
    txs = txs.filter(t => t.accountId === accountId || t.toAccountId === accountId);
  }

  if (startDate) {
    txs = txs.filter(t => new Date(t.date).getTime() >= new Date(startDate as string).getTime());
  }

  if (endDate) {
    txs = txs.filter(t => new Date(t.date).getTime() <= new Date(endDate as string).getTime() + 86400000 - 1);
  }

  if (search) {
    const q = (search as string).toLowerCase();
    txs = txs.filter(t =>
      (t.description && t.description.toLowerCase().includes(q)) ||
      (t.category && t.category.toLowerCase().includes(q)) ||
      (t.paymentMethod && t.paymentMethod.toLowerCase().includes(q)) ||
      (t.tags && t.tags.some((tag: string) => tag.toLowerCase().includes(q)))
    );
  }

  // Sorting
  txs.sort((a, b) => {
    let valA = a[sortBy as string];
    let valB = b[sortBy as string];

    if (sortBy === 'date') {
      valA = new Date(valA || 0).getTime();
      valB = new Date(valB || 0).getTime();
    } else if (sortBy === 'amount') {
      valA = Number(valA) || 0;
      valB = Number(valB) || 0;
    }

    if (sortOrder === 'asc') {
      return valA > valB ? 1 : -1;
    }
    return valA < valB ? 1 : -1;
  });

  const total = txs.length;
  const p = Math.max(1, parseInt(page as string, 10));
  const l = Math.min(100, Math.max(1, parseInt(limit as string, 10)));
  const startIndex = (p - 1) * l;
  const paginated = txs.slice(startIndex, startIndex + l);

  res.json({
    success: true,
    total,
    page: p,
    limit: l,
    totalPages: Math.ceil(total / l),
    transactions: paginated,
  });
});

// GET CSV EXPORT
router.get('/export/csv', (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.user._id;
  const workspaceId = req.workspaceId;
  const txs = db.find('transactions', t => t.userId === userId && (!workspaceId || t.workspaceId === workspaceId))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const headers = ['Date', 'Type', 'Amount', 'Currency', 'Category', 'Description', 'Notes', 'Payment Method', 'Account'];
  const rows = txs.map(t => {
    const acc = t.accountId ? db.findById('accounts', t.accountId) : null;
    return [
      `"${t.date?.slice(0, 10) || ''}"`,
      `"${t.type}"`,
      Number(t.amount) || 0,
      `"${t.currency || 'INR'}"`,
      `"${(t.category || '').replace(/"/g, '""')}"`,
      `"${(t.description || '').replace(/"/g, '""')}"`,
      `"${(t.notes || '').replace(/"/g, '""')}"`,
      `"${t.paymentMethod || ''}"`,
      `"${(acc?.name || '').replace(/"/g, '""')}"`,
    ].join(',');
  });

  const csv = [headers.join(','), ...rows].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="transactions_export.csv"');
  res.status(200).send(csv);
});

// BULK IMPORT TRANSACTIONS (Statement Import)
router.post('/bulk', (req: AuthenticatedRequest, res: Response): void => {
  try {
    const { transactions } = req.body;
    if (!Array.isArray(transactions) || transactions.length === 0) {
      res.status(400).json({ success: false, message: 'No transactions provided for bulk import.' });
      return;
    }

    const inserted: any[] = [];
    const userId = req.user._id;
    const workspaceId = req.workspaceId;
    const userCurrency = req.user.currency || 'INR';

    transactions.forEach(t => {
      const numAmount = Math.round(Number(t.amount) * 100) / 100;
      if (isNaN(numAmount) || numAmount <= 0) return;

      const txDate = t.date ? new Date(t.date).toISOString() : new Date().toISOString();
      const newTx = db.insert('transactions', {
        userId,
        workspaceId,
        type: t.type || 'expense',
        amount: numAmount,
        currency: t.currency || userCurrency,
        category: t.category || (t.type === 'income' ? 'Income' : 'Other expenses'),
        subcategory: t.subcategory || '',
        date: txDate,
        accountId: t.accountId || null,
        toAccountId: t.toAccountId || null,
        paymentMethod: t.paymentMethod || 'bank_transfer',
        description: t.description || 'Imported statement record',
        notes: t.notes || 'Imported via bank statement CSV',
        tags: Array.isArray(t.tags) ? t.tags : ['imported-statement'],
        isDiscretionary: Boolean(t.isDiscretionary),
      });

      // Update account balance if accountId is attached
      if (t.accountId) {
        const acc = db.findById('accounts', t.accountId);
        if (acc) {
          let updatedBalance = Number(acc.balance) || 0;
          if (t.type === 'expense') updatedBalance -= numAmount;
          else if (t.type === 'income') updatedBalance += numAmount;
          db.updateById('accounts', acc._id, { balance: Math.round(updatedBalance * 100) / 100 });
        }
      }

      inserted.push(newTx);
    });

    res.status(201).json({
      success: true,
      message: `Successfully imported ${inserted.length} transactions.`,
      count: inserted.length,
      transactions: inserted,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Bulk transaction import failed', error: err.message });
  }
});

// CREATE TRANSACTION
router.post('/', (req: AuthenticatedRequest, res: Response): void => {
  try {
    const {
      type,
      amount,
      currency,
      category,
      subcategory,
      date,
      accountId,
      toAccountId,
      paymentMethod,
      description,
      notes,
      tags,
      receiptUrl,
      isDiscretionary,
    } = req.body;

    const numAmount = Math.round(Number(amount) * 100) / 100;
    if (isNaN(numAmount) || numAmount <= 0) {
      res.status(400).json({ success: false, message: 'Transaction amount must be a positive number.' });
      return;
    }

    if (!type || !['income', 'expense', 'transfer'].includes(type)) {
      res.status(400).json({ success: false, message: 'Invalid transaction type.' });
      return;
    }

    if (type === 'transfer' && accountId && toAccountId && accountId === toAccountId) {
      res.status(400).json({ success: false, message: 'Source and destination accounts must be distinct for transfers.' });
      return;
    }

    const txDate = date ? new Date(date).toISOString() : new Date().toISOString();

    const newTx = db.insert('transactions', {
      userId: req.user._id,
      workspaceId: req.workspaceId,
      type,
      amount: numAmount,
      currency: currency || req.user.currency || 'INR',
      category: category || (type === 'income' ? 'Other income' : 'Other expenses'),
      subcategory: subcategory || '',
      date: txDate,
      accountId: accountId || null,
      toAccountId: toAccountId || null,
      paymentMethod: paymentMethod || 'upi',
      description: description?.trim() || '',
      notes: notes?.trim() || '',
      tags: Array.isArray(tags) ? tags : [],
      receiptUrl: receiptUrl || null,
      isDiscretionary: Boolean(isDiscretionary),
    });

    // Update Account Balances
    if (accountId) {
      const sourceAcc = db.findById('accounts', accountId);
      if (sourceAcc) {
        let newBalance = Number(sourceAcc.balance) || 0;
        if (type === 'expense') {
          newBalance -= numAmount;
        } else if (type === 'income') {
          newBalance += numAmount;
        } else if (type === 'transfer') {
          newBalance -= numAmount;
        }
        db.updateById('accounts', accountId, { balance: Math.round(newBalance * 100) / 100 });
      }
    }

    // In transfer, add to destination account
    if (type === 'transfer' && toAccountId) {
      const destAcc = db.findById('accounts', toAccountId);
      if (destAcc) {
        const destBalance = (Number(destAcc.balance) || 0) + numAmount;
        db.updateById('accounts', toAccountId, { balance: Math.round(destBalance * 100) / 100 });
      }
    }

    res.status(201).json({ success: true, transaction: newTx });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to record transaction', error: err.message });
  }
});

// GET TRANSACTION BY ID
router.get('/:id', (req: AuthenticatedRequest, res: Response): void => {
  const tx = db.findById('transactions', req.params.id);
  if (!tx || tx.userId !== req.user._id) {
    res.status(404).json({ success: false, message: 'Transaction not found.' });
    return;
  }
  res.json({ success: true, transaction: tx });
});

// UPDATE TRANSACTION
router.patch('/:id', (req: AuthenticatedRequest, res: Response): void => {
  try {
    const existing = db.findById('transactions', req.params.id);
    if (!existing || existing.userId !== req.user._id) {
      res.status(404).json({ success: false, message: 'Transaction not found.' });
      return;
    }

    // Revert old balance effect first
    const oldAmount = Number(existing.amount) || 0;
    if (existing.accountId) {
      const acc = db.findById('accounts', existing.accountId);
      if (acc) {
        let revBalance = Number(acc.balance) || 0;
        if (existing.type === 'expense' || existing.type === 'transfer') revBalance += oldAmount;
        else if (existing.type === 'income') revBalance -= oldAmount;
        db.updateById('accounts', acc._id, { balance: Math.round(revBalance * 100) / 100 });
      }
    }
    if (existing.type === 'transfer' && existing.toAccountId) {
      const dest = db.findById('accounts', existing.toAccountId);
      if (dest) {
        const revBalance = (Number(dest.balance) || 0) - oldAmount;
        db.updateById('accounts', dest._id, { balance: Math.round(revBalance * 100) / 100 });
      }
    }

    // Prepare updates
    const updates: any = {};
    const allowed = ['amount', 'type', 'category', 'subcategory', 'date', 'accountId', 'toAccountId', 'paymentMethod', 'description', 'notes', 'tags', 'receiptUrl', 'isDiscretionary'];
    allowed.forEach(k => {
      if (req.body[k] !== undefined) {
        if (k === 'amount') updates[k] = Math.round(Number(req.body[k]) * 100) / 100;
        else updates[k] = req.body[k];
      }
    });

    const updatedTx = db.updateById('transactions', existing._id, updates);

    // Apply new balance effect
    const newAmount = Number(updatedTx.amount) || 0;
    if (updatedTx.accountId) {
      const acc = db.findById('accounts', updatedTx.accountId);
      if (acc) {
        let newBalance = Number(acc.balance) || 0;
        if (updatedTx.type === 'expense' || updatedTx.type === 'transfer') newBalance -= newAmount;
        else if (updatedTx.type === 'income') newBalance += newAmount;
        db.updateById('accounts', acc._id, { balance: Math.round(newBalance * 100) / 100 });
      }
    }
    if (updatedTx.type === 'transfer' && updatedTx.toAccountId) {
      const dest = db.findById('accounts', updatedTx.toAccountId);
      if (dest) {
        const destBalance = (Number(dest.balance) || 0) + newAmount;
        db.updateById('accounts', dest._id, { balance: Math.round(destBalance * 100) / 100 });
      }
    }

    res.json({ success: true, transaction: updatedTx });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to update transaction', error: err.message });
  }
});

// DELETE TRANSACTION
router.delete('/:id', (req: AuthenticatedRequest, res: Response): void => {
  const existing = db.findById('transactions', req.params.id);
  if (!existing || existing.userId !== req.user._id) {
    res.status(404).json({ success: false, message: 'Transaction not found.' });
    return;
  }

  // Revert balance effect
  const amount = Number(existing.amount) || 0;
  if (existing.accountId) {
    const acc = db.findById('accounts', existing.accountId);
    if (acc) {
      let revBalance = Number(acc.balance) || 0;
      if (existing.type === 'expense' || existing.type === 'transfer') revBalance += amount;
      else if (existing.type === 'income') revBalance -= amount;
      db.updateById('accounts', acc._id, { balance: Math.round(revBalance * 100) / 100 });
    }
  }
  if (existing.type === 'transfer' && existing.toAccountId) {
    const dest = db.findById('accounts', existing.toAccountId);
    if (dest) {
      const revBalance = (Number(dest.balance) || 0) - amount;
      db.updateById('accounts', dest._id, { balance: Math.round(revBalance * 100) / 100 });
    }
  }

  db.deleteById('transactions', existing._id);
  res.json({ success: true, message: 'Transaction deleted.' });
});

export default router;
