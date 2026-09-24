import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { ENV } from './config/env.js';
import { generalLimiter } from './middleware/rateLimiter.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { healthRouter } from './routes/healthRoutes.js';
import { pledgeRouter } from './routes/pledgeRoutes.js';

export const app = express();

// -------------------------------------------------------------
// Security Headers
// -------------------------------------------------------------
app.use(helmet());

// -------------------------------------------------------------
// CORS Configuration
// -------------------------------------------------------------
const allowedOrigins = [
  ENV.FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:4173',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:4173',
  'https://ncsam-pledge.vercel.app',
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or server-to-server)
      if (!origin) return callback(null, true);

      const isAllowed = allowedOrigins.some((allowed) => {
        if (allowed === origin) return true;
        // Allow subdomains or preview deployments if matched
        if (origin.endsWith('.vercel.app')) return true;
        return false;
      });

      if (isAllowed) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not permitted by CORS policy.`));
      }
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Accept', 'Authorization'],
    credentials: false,
    maxAge: 86400, // 24 hours preflight cache
  })
);

// -------------------------------------------------------------
// Request Body Parsing & Limits
// -------------------------------------------------------------
app.use(express.json({ limit: '50kb' }));
app.use(express.urlencoded({ extended: false, limit: '50kb' }));

// -------------------------------------------------------------
// Global Rate Limiter
// -------------------------------------------------------------
app.use(generalLimiter);

// -------------------------------------------------------------
// Application Routes
// -------------------------------------------------------------
app.use('/api', healthRouter);
app.use('/api/pledges', pledgeRouter);

// -------------------------------------------------------------
// 404 & Centralized Error Handlers
// -------------------------------------------------------------
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
