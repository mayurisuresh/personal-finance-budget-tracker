import { Router, Response } from 'express';
import { db } from '../db/store.js';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';
import {
  calculateDashboardSummary,
  getCategoryBreakdown,
  evaluateOverspendingAndAlerts,
} from '../services/analyticsEngine.js';
import { generateFinancialPdf } from '../services/pdfReportGenerator.js';

const router = Router();
router.use(authMiddleware);

// GET REPORT SUMMARY
router.get('/summary', (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.user._id;
  const workspaceId = req.workspaceId || '';
  const { period = 'month', startDate, endDate } = req.query;

  let start = startDate as string;
  let end = endDate as string;

  const now = new Date();
  if (!start || !end) {
    if (period === 'month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
    } else if (period === 'quarter') {
      const qMonth = Math.floor(now.getMonth() / 3) * 3;
      start = new Date(now.getFullYear(), qMonth, 1).toISOString().slice(0, 10);
      end = new Date(now.getFullYear(), qMonth + 3, 0).toISOString().slice(0, 10);
    } else if (period === 'year') {
      start = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10);
      end = new Date(now.getFullYear(), 11, 31).toISOString().slice(0, 10);
    }
  }

  const summary = calculateDashboardSummary(userId, workspaceId, { startDate: start, endDate: end });
  const categoryBreakdown = getCategoryBreakdown(userId, workspaceId, { startDate: start, endDate: end });
  const { insights } = evaluateOverspendingAndAlerts(userId, workspaceId);

  res.json({
    success: true,
    periodLabel: period.toString().toUpperCase(),
    startDate: start,
    endDate: end,
    summary,
    categories: categoryBreakdown.categories,
    insights,
  });
});

// EXPORT PDF
router.get('/export/pdf', (req: AuthenticatedRequest, res: Response): void => {
  try {
    const userId = req.user._id;
    const workspaceId = req.workspaceId || '';
    const workspace = workspaceId ? db.findById('workspaces', workspaceId) : null;
    const { period = 'month', startDate, endDate } = req.query;

    let start = startDate as string;
    let end = endDate as string;
    const now = new Date();
    if (!start || !end) {
      start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
    }

    const summary = calculateDashboardSummary(userId, workspaceId, { startDate: start, endDate: end });
    const categoryBreakdown = getCategoryBreakdown(userId, workspaceId, { startDate: start, endDate: end });
    const budgets = db.find('budgets', b => b.userId === userId && (!workspaceId || b.workspaceId === workspaceId));
    const { insights } = evaluateOverspendingAndAlerts(userId, workspaceId);

    const enrichedBudgets = budgets.map(b => {
      const cat = categoryBreakdown.categories.find(c => c.category === b.category);
      const spent = cat ? cat.amount : 0;
      let status = 'within';
      if (spent > b.limitAmount) status = 'exceeded';
      else if (spent >= b.limitAmount * 0.8) status = 'approaching';
      return {
        name: b.name,
        limitAmount: b.limitAmount,
        spent,
        status,
      };
    });

    const pdfBuffer = generateFinancialPdf({
      userName: req.user.name,
      workspaceName: workspace?.name || 'Personal Workspace',
      currency: req.user.currency === 'USD' ? '$' : req.user.currency === 'EUR' ? '€' : req.user.currency === 'GBP' ? '£' : '₹',
      startDate: start,
      endDate: end,
      periodLabel: period.toString().toUpperCase(),
      summary,
      categoryBreakdown: categoryBreakdown.categories,
      budgets: enrichedBudgets,
      insights,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="finance_statement_${start}_${end}.pdf"`);
    res.send(pdfBuffer);
  } catch (err: any) {
    console.error('PDF generation error:', err);
    res.status(500).json({ success: false, message: 'Failed to generate PDF report', error: err.message });
  }
});

export default router;
