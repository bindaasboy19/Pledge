import rateLimit from 'express-rate-limit';
import { ENV } from '../config/env.js';

/**
 * General API rate limiter to protect public endpoints.
 */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => ENV.NODE_ENV === 'test',
  message: {
    success: false,
    message: 'Too many requests from this IP. Please try again after 15 minutes.',
    errorCode: 'RATE_LIMIT_EXCEEDED',
  },
});

/**
 * Stricter rate limiter for pledge submissions.
 */
export const pledgeSubmissionLimiter = rateLimit({
  windowMs: ENV.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000,
  max: ENV.RATE_LIMIT_MAX_REQUESTS || 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => ENV.NODE_ENV === 'test',
  message: {
    success: false,
    message: 'Too many pledge submissions from this network. Please wait a moment before trying again.',
    errorCode: 'RATE_LIMIT_EXCEEDED',
  },
});

export default {
  generalLimiter,
  pledgeSubmissionLimiter,
};
