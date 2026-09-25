import mongoose from 'mongoose';
import { ENV } from './env.js';

let mongodInstance = null;

/**
 * Masks credentials in MongoDB URI for safe server logging.
 * Example: mongodb+srv://user:pass@cluster.mongodb.net/db -> mongodb+srv://***:***@cluster.mongodb.net/db
 */
export function sanitizeMongoUriForLog(uri) {
  if (!uri) return '[not configured]';
  return uri.replace(/\/\/(.*?):(.*?)@/, '//***:***@');
}

/**
 * Normalizes MongoDB URI to ensure database name is specified.
 * If user provides mongodb+srv://user:pass@cluster.mongodb.net/?appName=...
 * it injects /ncsam-pledge before the query string.
 */
export function normalizeMongoUri(rawUri) {
  if (!rawUri) return '';
  let uri = rawUri.trim();

  if (uri.startsWith('mongodb+srv://') || uri.startsWith('mongodb://')) {
    const match = uri.match(/^(mongodb(?:\+srv)?:\/\/[^\/]+)(\/?[^?]*)(.*)$/);
    if (match) {
      const [, prefix, dbPath, query] = match;
      if (!dbPath || dbPath === '/') {
        uri = `${prefix}/ncsam-pledge${query ? query : '?retryWrites=true&w=majority'}`;
      }
    }
  }
  return uri;
}

/**
 * Pre-seeds the atomic sequence counter at 26000000 if not already created.
 */
async function seedCounterIfMissing() {
  try {
    const { Counter } = await import('../models/Counter.js');
    const existing = await Counter.findById('pledge');
    if (!existing) {
      await Counter.create({ _id: 'pledge', sequence: 26000000 });
      console.log('[Database] Seeded pledge sequence counter with base 26000000.');
    }
  } catch (err) {
    console.warn('[Database] Note: Could not auto-seed pledge counter:', err.message);
  }
}

/**
 * Drops legacy certificateId_1 index if present to optimize storage and eliminate dead indexes.
 */
async function cleanupLegacyIndexes() {
  try {
    const collection = mongoose.connection.collection('pledges');
    const indexes = await collection.indexes();
    const hasCertIndex = indexes.some((idx) => idx.name === 'certificateId_1');
    if (hasCertIndex) {
      await collection.dropIndex('certificateId_1');
      console.log('[Database] Dropped legacy certificateId_1 index.');
    }
  } catch (_) {
    // Ignore if collection not present yet
  }
}

/**
 * Connect to MongoDB with graceful local fallback in development/test.
 */
export async function connectDB(uriOverride = null) {
  let rawUri = uriOverride || ENV.MONGODB_URI;
  let uri = normalizeMongoUri(rawUri);

  if (!uri) {
    if (ENV.NODE_ENV === 'production') {
      console.error('[Database] FATAL: MONGODB_URI environment variable is missing in production environment.');
      console.error('[Database] Please configure MONGODB_URI in your cloud deployment settings (e.g. Render / Vercel dashboard).');
      throw new Error('MONGODB_URI environment variable is required in production.');
    }

    // In development/test, auto-spin MongoDB Memory Server if no URI is provided
    try {
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      mongodInstance = await MongoMemoryServer.create();
      uri = mongodInstance.getUri();
      console.log('[Database] Started in-memory MongoDB instance for development/testing.');
    } catch (err) {
      console.error('[Database] Failed to initialize MongoMemoryServer fallback:', err.message);
      uri = 'mongodb://127.0.0.1:27017/ncsam-pledge';
    }
  }

  mongoose.connection.on('error', (err) => {
    console.error('[Database] MongoDB connection error:', err.message);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('[Database] MongoDB disconnected.');
  });

  try {
    console.log(`[Database] Connecting to MongoDB (${sanitizeMongoUriForLog(uri)})...`);
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 8000,
    });
    console.log('[Database] MongoDB connected successfully.');
    await seedCounterIfMissing();
    await cleanupLegacyIndexes();
    return mongoose.connection;
  } catch (error) {
    console.error('[Database] Connection failure:', error.message);
    console.error('[Database] Diagnostic Checklist:');
    console.error('  1. Network Access: Ensure your deployment server IP is allowed in MongoDB Atlas > Network Access (or 0.0.0.0/0 for dynamic cloud PaaS like Render).');
    console.error('  2. Credentials: Verify username and password in MONGODB_URI (ensure special characters in passwords are URL-encoded).');
    console.error('  3. Cluster Status: Check that your MongoDB Atlas cluster is active.');

    // Only fallback to memory server in local development/test
    if (!mongodInstance && ENV.NODE_ENV !== 'production') {
      try {
        console.log('[Database] Falling back to local MongoDB Memory Server for development...');
        const { MongoMemoryServer } = await import('mongodb-memory-server');
        mongodInstance = await MongoMemoryServer.create();
        const memUri = mongodInstance.getUri();
        await mongoose.connect(memUri);
        console.log('[Database] Connected to fallback in-memory MongoDB.');
        await seedCounterIfMissing();
        return mongoose.connection;
      } catch (fallbackErr) {
        console.error('[Database] Memory server fallback failed:', fallbackErr.message);
      }
    }
    throw error;
  }
}

/**
 * Disconnect from MongoDB and stop memory instance if running.
 */
export async function disconnectDB() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (mongodInstance) {
    await mongodInstance.stop();
    mongodInstance = null;
  }
  console.log('[Database] MongoDB disconnected.');
}

/**
 * Check if database is currently connected.
 */
export function isDbConnected() {
  return mongoose.connection.readyState === 1;
}

export default {
  sanitizeMongoUriForLog,
  normalizeMongoUri,
  connectDB,
  disconnectDB,
  isDbConnected,
};
