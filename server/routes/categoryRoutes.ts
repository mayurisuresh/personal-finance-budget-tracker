import { Router, Response } from 'express';
import { db } from '../db/store.js';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

// GET ALL CATEGORIES
router.get('/', (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.user._id;
  const workspaceId = req.workspaceId;
  const categories = db.find('categories', c => c.userId === userId && (!workspaceId || c.workspaceId === workspaceId));
  res.json({ success: true, categories });
});

// CREATE CATEGORY
router.post('/', (req: AuthenticatedRequest, res: Response): void => {
  try {
    const { name, type, icon, color, isDiscretionary, monthlyBudgetLimit } = req.body;
    if (!name) {
      res.status(400).json({ success: false, message: 'Category name is required.' });
      return;
    }

    const newCategory = db.insert('categories', {
      userId: req.user._id,
      workspaceId: req.workspaceId,
      name: name.trim(),
      type: type || 'expense',
      icon: icon || 'Tag',
      color: color || '#3B82F6',
      isDiscretionary: Boolean(isDiscretionary),
      monthlyBudgetLimit: Number(monthlyBudgetLimit) || 0,
      isCustom: true,
    });

    res.status(201).json({ success: true, category: newCategory });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to create category', error: err.message });
  }
});

// UPDATE CATEGORY
router.patch('/:id', (req: AuthenticatedRequest, res: Response): void => {
  const cat = db.findById('categories', req.params.id);
  if (!cat || cat.userId !== req.user._id) {
    res.status(404).json({ success: false, message: 'Category not found.' });
    return;
  }

  const updates: any = {};
  ['name', 'icon', 'color', 'isDiscretionary', 'monthlyBudgetLimit'].forEach(k => {
    if (req.body[k] !== undefined) updates[k] = req.body[k];
  });

  const updated = db.updateById('categories', cat._id, updates);
  res.json({ success: true, category: updated });
});

// DELETE CATEGORY
router.delete('/:id', (req: AuthenticatedRequest, res: Response): void => {
  const cat = db.findById('categories', req.params.id);
  if (!cat || cat.userId !== req.user._id) {
    res.status(404).json({ success: false, message: 'Category not found.' });
    return;
  }

  db.deleteById('categories', cat._id);
  res.json({ success: true, message: 'Category deleted.' });
});

export default router;
