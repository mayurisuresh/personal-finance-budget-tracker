import express from 'express';
import http from 'http';
import cookieParser from 'cookie-parser';
import fs from 'fs';
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
// Port configuration: uses process.env.PORT first (e.g. for Render or cloud deployment),
// falling back to 3000 for local development (and AI Studio dev proxy)
const isAiStudioDev = process.env.DISABLE_HMR === 'true' && process.env.NODE_ENV !== 'production';
const PORT = process.env.PORT && !isAiStudioDev ? parseInt(process.env.PORT, 10) : 3000;
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
      try {
        const envPath = path.resolve(__dirname, '.env');
        let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : '';
        if (envContent.includes('MONGODB_URI=')) {
          envContent = envContent.replace(/MONGODB_URI=.*/g, `MONGODB_URI=${connectionString}`);
        } else {
          envContent += `\nMONGODB_URI=${connectionString}\n`;
        }
        fs.writeFileSync(envPath, envContent.trim() + '\n', 'utf-8');
      } catch (err: any) {
        console.warn('[DB] Could not persist to .env:', err.message);
      }
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
  // Ensure production mode when deployed on Render or when NODE_ENV is production
  const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';

  if (!isProduction) {
    // In Dev: Mount Vite middleware
    // Explicitly configure HMR to bind to httpServer to avoid unrouted port 24678 WebSocket errors
    const isHmrDisabled = process.env.DISABLE_HMR === 'true';
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: isHmrDisabled ? false : { server: httpServer },
        allowedHosts: ['personal-finance-budget-tracker-fagn.onrender.com'],
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // In Prod: Serve static build from dist directory
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));

    // API 404 handler so unmatched API routes don't return index.html
    app.all('/api/*', (req, res) => {
      res.status(404).json({ success: false, message: 'API route not found.' });
    });

    // SPA fallback: send index.html for frontend navigation routes
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  // Bind Express server to 0.0.0.0 on configured PORT
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT} [${process.env.NODE_ENV || 'development'}]`);
  });

  // Non-blocking database connection attempt in background so dev server starts immediately
  initDatabaseConnection().catch(err => {
    console.warn('[DB] Background MongoDB initialization caught:', err?.message || err);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});
