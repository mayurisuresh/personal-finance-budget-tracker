import { Router, Response } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';
import {
  calculateDashboardSummary,
  getCategoryBreakdown,
  getSpendingTrends,
  evaluateOverspendingAndAlerts,
  calculateFinancialHealthScore,
} from '../services/analyticsEngine.js';

const router = Router();
router.use(authMiddleware);

// GET DASHBOARD SUMMARY
router.get('/summary', (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.user._id;
  const workspaceId = req.workspaceId || req.user.activeWorkspaceId;
  const { startDate, endDate } = req.query;

  const summary = calculateDashboardSummary(userId, workspaceId, {
    startDate: startDate as string,
    endDate: endDate as string,
  });

  res.json({ success: true, summary });
});

// GET TRENDS
router.get('/trends', (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.user._id;
  const workspaceId = req.workspaceId || req.user.activeWorkspaceId;
  const days = req.query.days ? parseInt(req.query.days as string, 10) : 30;

  const trends = getSpendingTrends(userId, workspaceId, days);
  res.json({ success: true, trends });
});

// GET CATEGORY BREAKDOWN
router.get('/category-breakdown', (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.user._id;
  const workspaceId = req.workspaceId || req.user.activeWorkspaceId;
  const { startDate, endDate } = req.query;

  const breakdown = getCategoryBreakdown(userId, workspaceId, {
    startDate: startDate as string,
    endDate: endDate as string,
  });

  res.json({ success: true, breakdown });
});

// GET SMART INSIGHTS & REAL-TIME ALERTS
router.get('/insights', (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.user._id;
  const workspaceId = req.workspaceId || req.user.activeWorkspaceId;

  const { alerts, insights } = evaluateOverspendingAndAlerts(userId, workspaceId);
  res.json({ success: true, alerts, insights });
});

// GET FINANCIAL HEALTH SCORE
router.get('/health-score', (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.user._id;
  const workspaceId = req.workspaceId || req.user.activeWorkspaceId;
  const healthScore = calculateFinancialHealthScore(userId, workspaceId);
  res.json({ success: true, healthScore });
});

export default router;
