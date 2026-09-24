import { app } from './app.js';
import { ENV } from './config/env.js';
import { connectDB, disconnectDB } from './config/db.js';

let server = null;

async function startServer() {
  try {
    console.log(`[Server] Initializing NCSAM Pledge Backend in ${ENV.NODE_ENV} mode...`);

    // Connect to MongoDB
    await connectDB();

    // Start HTTP listener
    server = app.listen(ENV.PORT, () => {
      console.log(`[Server] Express server actively listening on port ${ENV.PORT}`);
      console.log(`[Server] Health check available at: http://localhost:${ENV.PORT}/api/health`);
    });
  } catch (error) {
    console.error('[Server] Fatal startup error:', error.message);
    process.exit(1);
  }
}

// Graceful shutdown handling
const shutdown = async (signal) => {
  console.log(`\n[Server] Received ${signal}. Commencing graceful shutdown...`);
  if (server) {
    server.close(async () => {
      console.log('[Server] HTTP listener closed.');
      await disconnectDB();
      console.log('[Server] Graceful shutdown complete. Exiting.');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

startServer();
