import express from 'express';
import http from 'http';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { initDatabaseConnection, getDatabaseStatus, isValidMongoUri } from './server/db/connection.js';
import { db } from './server/db/store.js';

import authRoutes from './server/routes/authRoutes.js';
import workspaceRoutes from './server/routes/workspaceRoutes.js';
import accountRoutes from './server/routes/accountRoutes.js';
import categoryRoutes from './server/routes/categoryRoutes.js';
import transactionRoutes from './server/routes/transactionRoutes.js';
import budgetRoutes from './server/routes/budgetRoutes.js';
import savingsRoutes from './server/routes/savingsRoutes.js';
import billRoutes from './server/routes/billRoutes.js';
import dashboardRoutes from './server/routes/dashboardRoutes.js';
import notificationRoutes from './server/routes/notificationRoutes.js';
import reportRoutes from './server/routes/reportRoutes.js';
import aiRoutes from './server/routes/aiRoutes.js';

dotenv.config();

// Process-level unhandled rejection & exception guards
process.on('unhandledRejection', (reason, promise) => {
  console.error('[Process] Unhandled Promise Rejection at:', promise, 'reason:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('[Process] Uncaught Exception:', err);
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const httpServer = http.createServer(app);

// Security & Parsing Middlewares
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Disable x-powered-by
app.disable('x-powered-by');

// API Health & Detailed Database Status
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    database: getDatabaseStatus(),
    environment: {
      nodeEnv: process.env.NODE_ENV || 'development',
      port: PORT,
      jwtConfigured: Boolean(process.env.JWT_SECRET && process.env.JWT_SECRET !== 'super-secret-jwt-key-replace-in-production'),
    },
  });
});

// Test MongoDB Atlas connection with explicit verification & reconnection
app.post('/api/health/test-db', async (req, res) => {
  const { connectionString } = req.body;
  const testUri = (connectionString || process.env.MONGODB_URI || '').trim();
  const validation = isValidMongoUri(testUri);
  if (!validation.valid) {
    return res.status(400).json({
      success: false,
      message: validation.reason || 'Please provide a valid MongoDB connection string starting with "mongodb://" or "mongodb+srv://".',
    });
  }
  try {
    const conn = await mongoose.createConnection(testUri, { dbName: 'personal_finance', serverSelectionTimeoutMS: 5000 }).asPromise();
    await conn.close();
    
    // If successful and it matches current env or new string, connect main mongoose client
    if (connectionString) {
      process.env.MONGODB_URI = connectionString;
    }
    await initDatabaseConnection();
    const syncRes = await db.syncWithAtlas();

    res.json({
      success: true,
      message: 'MongoDB Atlas connection verified and active.',
      sync: syncRes,
      status: getDatabaseStatus(),
    });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      message: `Connection failed: ${err.message}`,
      status: getDatabaseStatus(),
    });
  }
});

// Trigger Atlas synchronization pass
app.post('/api/health/sync-db', async (req, res) => {
  try {
    const result = await db.syncWithAtlas();
    res.json({
      success: result.synced,
      message: result.synced
        ? `Successfully synchronized ${result.collectionsSynced} collections with MongoDB Atlas`
        : 'MongoDB Atlas is not currently in a connected state. Ensure Atlas Network Access IP whitelist is enabled.',
      details: result,
      status: getDatabaseStatus(),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// REST API Routers
app.use('/api/auth', authRoutes);
app.use('/api/workspaces', workspaceRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/savings-goals', savingsRoutes);
app.use('/api/bills', billRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/ai', aiRoutes);

// Global Error Handler for API
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled Express Server Error:', err);
  if (res.headersSent) return next(err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error occurred.',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

async function startServer() {
  await initDatabaseConnection();

  if (process.env.NODE_ENV !== 'production') {
    // In Dev: Mount Vite middleware
    // Explicitly configure HMR to bind to httpServer to avoid unrouted port 24678 WebSocket errors
    const isHmrDisabled = process.env.DISABLE_HMR === 'true';
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: isHmrDisabled ? false : { server: httpServer },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // In Prod: Serve static build
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});
