import { Router, Response } from 'express';
import { db } from '../db/store.js';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';
import { evaluateOverspendingAndAlerts } from '../services/analyticsEngine.js';

const router = Router();
router.use(authMiddleware);

// GET ALL NOTIFICATIONS (Syncs active rule-based alerts into persistent notification collection)
router.get('/', (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.user._id;
  const workspaceId = req.workspaceId || req.user.activeWorkspaceId;

  // Run dynamic evaluation
  const { alerts } = evaluateOverspendingAndAlerts(userId, workspaceId);

  // Sync with persistent notifications to avoid duplicate spam
  const existingNotifications = db.find('notifications', n => n.userId === userId && (!workspaceId || n.workspaceId === workspaceId));

  alerts.forEach(alert => {
    // Check if an alert with this title & entity was already created today
    const today = new Date().toISOString().slice(0, 10);
    const alreadyExists = existingNotifications.some(
      n => n.type === alert.type && n.relatedEntityId === alert.relatedEntityId && n.createdAt.slice(0, 10) === today
    );

    if (!alreadyExists) {
      const created = db.insert('notifications', {
        userId,
        workspaceId,
        title: alert.title,
        message: alert.message,
        type: alert.type,
        severity: alert.severity,
        isRead: false,
        dismissed: false,
        relatedEntityId: alert.relatedEntityId,
        relatedEntityType: alert.relatedEntityType,
      });
      existingNotifications.unshift(created);
    }
  });

  const active = existingNotifications
    .filter(n => !n.dismissed)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const unreadCount = active.filter(n => !n.isRead).length;

  res.json({
    success: true,
    notifications: active,
    unreadCount,
  });
});

// MARK NOTIFICATION READ
router.patch('/:id/read', (req: AuthenticatedRequest, res: Response): void => {
  const notif = db.findById('notifications', req.params.id);
  if (!notif || notif.userId !== req.user._id) {
    res.status(404).json({ success: false, message: 'Notification not found.' });
    return;
  }

  const updated = db.updateById('notifications', notif._id, { isRead: true });
  res.json({ success: true, notification: updated });
});

// MARK ALL READ
router.patch('/read-all', (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.user._id;
  const workspaceId = req.workspaceId;

  const notifs = db.find('notifications', n => n.userId === userId && (!workspaceId || n.workspaceId === workspaceId));
  notifs.forEach(n => {
    if (!n.isRead) {
      db.updateById('notifications', n._id, { isRead: true });
    }
  });

  res.json({ success: true, message: 'All notifications marked as read.' });
});

// DISMISS NOTIFICATION
router.patch('/:id/dismiss', (req: AuthenticatedRequest, res: Response): void => {
  const notif = db.findById('notifications', req.params.id);
  if (!notif || notif.userId !== req.user._id) {
    res.status(404).json({ success: false, message: 'Notification not found.' });
    return;
  }

  const updated = db.updateById('notifications', notif._id, { dismissed: true });
  res.json({ success: true, notification: updated });
});

export default router;
