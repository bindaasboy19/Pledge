import mongoose from 'mongoose';
import { ENV } from './env.js';

let mongodInstance = null;

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
 * Connect to MongoDB with graceful local fallback in development/test.
 */
export async function connectDB(uriOverride = null) {
  let uri = uriOverride || ENV.MONGODB_URI;

  if (!uri) {
    if (ENV.NODE_ENV === 'production') {
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
      // Fallback to default local mongo port
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
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('[Database] MongoDB connected successfully.');
    await seedCounterIfMissing();
    return mongoose.connection;
  } catch (error) {
    console.error('[Database] Initial connection error:', error.message);

    // If local connection failed in development and we haven't tried memory server yet
    if (!mongodInstance && ENV.NODE_ENV !== 'production') {
      try {
        console.log('[Database] Local MongoDB unreachable. Falling back to MongoDB Memory Server...');
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
  connectDB,
  disconnectDB,
  isDbConnected,
};
