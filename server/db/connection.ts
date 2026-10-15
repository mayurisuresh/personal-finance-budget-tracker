import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

let isMongoConnected = false;
let lastConnectionAttemptError: string | null = null;
let lastConnectionTimestamp: string | null = null;
let clusterHost: string | null = null;

// Track mongoose connection events
mongoose.connection.on('connected', () => {
  isMongoConnected = true;
  lastConnectionAttemptError = null;
  lastConnectionTimestamp = new Date().toISOString();
  console.log('[DB] Mongoose connected to MongoDB Atlas database:', mongoose.connection.name);
});

mongoose.connection.on('error', (err) => {
  isMongoConnected = false;
  lastConnectionAttemptError = `Mongoose runtime error: ${err.message}`;
  console.error('[DB] Mongoose connection error:', err.message);
});

mongoose.connection.on('disconnected', () => {
  isMongoConnected = false;
  console.warn('[DB] Mongoose disconnected from MongoDB Atlas');
});

export function isValidMongoUri(uri?: string | null): { valid: boolean; reason?: string } {
  if (!uri || !uri.trim()) {
    return { valid: false, reason: 'No MONGODB_URI configured' };
  }
  const trimmed = uri.trim();
  if (!trimmed.startsWith('mongodb://') && !trimmed.startsWith('mongodb+srv://')) {
    return {
      valid: false,
      reason: 'Invalid scheme: expected connection string to start with "mongodb://" or "mongodb+srv://"',
    };
  }
  if (
    trimmed.includes('<username>') ||
    trimmed.includes('<password>') ||
    trimmed.includes('<dbname>') ||
    trimmed.includes('<your_password>')
  ) {
    return {
      valid: false,
      reason: 'Contains unconfigured template placeholders (<username> / <password>)',
    };
  }
  return { valid: true };
}

export async function initDatabaseConnection(): Promise<{ connected: boolean; mode: string }> {
  const uri = process.env.MONGODB_URI;
  const validation = isValidMongoUri(uri);

  if (validation.valid && uri) {
    try {
      // Extract host for clean logging without exposing credentials
      try {
        const parsed = new URL(uri.trim());
        clusterHost = parsed.host;
      } catch {
        clusterHost = 'mongodb-atlas-cluster';
      }

      console.log(`[DB] Attempting connection to MongoDB Atlas cluster (${clusterHost})...`);

      await mongoose.connect(uri.trim(), {
        dbName: 'personal_finance',
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 10000,
      });

      isMongoConnected = mongoose.connection.readyState === 1;
      lastConnectionAttemptError = null;
      lastConnectionTimestamp = new Date().toISOString();
      console.log('[DB] MongoDB Atlas connection verified and active via Mongoose.');
      return { connected: true, mode: 'mongodb' };
    } catch (err: any) {
      isMongoConnected = false;
      lastConnectionAttemptError = `Connection attempt failed: ${err.message}`;
      lastConnectionTimestamp = new Date().toISOString();
      console.warn('[DB] MongoDB Atlas connection attempt failed:', err.message);
      console.log('[DB] Maintaining local persistent fallback until MongoDB Atlas network access is whitelisted.');
      return { connected: false, mode: 'embedded_fallback' };
    }
  } else {
    isMongoConnected = false;
    lastConnectionTimestamp = new Date().toISOString();
    if (uri && uri.trim() && !validation.valid) {
      lastConnectionAttemptError = validation.reason || 'Invalid MongoDB URI configuration';
      console.log(`[DB] Remote MongoDB URI not used (${validation.reason}).`);
    } else {
      lastConnectionAttemptError = null;
      console.log('[DB] No remote MongoDB Atlas URI provided.');
    }
    return { connected: false, mode: 'embedded_development' };
  }
}

export function getDatabaseStatus() {
  const uri = process.env.MONGODB_URI;
  const validation = isValidMongoUri(uri);
  const isConnected = mongoose.connection.readyState === 1;

  let limitationNote = '';
  if (isConnected) {
    limitationNote = 'All transactions, budgets, savings goals, bills, and user records are actively persisted in MongoDB Atlas.';
  } else if (validation.valid) {
    limitationNote =
      'MongoDB Atlas URI is configured, but the Atlas cluster requires IP Whitelist access. In MongoDB Atlas, go to "Network Access" -> click "Add IP Address" -> choose "Allow Access From Anywhere" (0.0.0.0/0) or add your current runtime IP. Once added, MongoDB Atlas connects automatically.';
  } else {
    limitationNote =
      'Configure MONGODB_URI in .env with a valid MongoDB Atlas connection string starting with "mongodb://" or "mongodb+srv://".';
  }

  return {
    isMongoConnected: isConnected,
    mode: isConnected
      ? 'MongoDB Atlas (Verified & Active)'
      : validation.valid
      ? 'MongoDB Atlas Configured (Awaiting Atlas Network Whitelist)'
      : 'Local Document Store (Development Fallback)',
    uriConfigured: validation.valid,
    clusterHost: isConnected ? clusterHost : (validation.valid ? clusterHost : null),
    lastChecked: lastConnectionTimestamp,
    errorMessage: isConnected ? null : lastConnectionAttemptError,
    limitationNote,
  };
}
