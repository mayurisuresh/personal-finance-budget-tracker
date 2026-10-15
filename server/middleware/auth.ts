import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../db/store.js';

const JWT_SECRET = process.env.JWT_SECRET || 'secret-jwt-key-finance-tracker-dev-2026';

export interface AuthenticatedRequest extends Request {
  user?: any;
  workspaceId?: string;
}

export function generateToken(payload: { userId: string; email: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  try {
    let token = req.cookies?.token;

    if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      res.status(401).json({ success: false, message: 'Authentication required. No session token provided.' });
      return;
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; email: string };
    const user = db.findById('users', decoded.userId);

    if (!user) {
      res.status(401).json({ success: false, message: 'Invalid session or user not found.' });
      return;
    }

    req.user = user;
    // Resolve active workspace
    const workspaceHeader = req.headers['x-workspace-id'] as string;
    req.workspaceId = workspaceHeader || user.activeWorkspaceId || 'default';

    next();
  } catch (err: any) {
    res.status(401).json({ success: false, message: 'Invalid or expired token', error: err.message });
  }
}
