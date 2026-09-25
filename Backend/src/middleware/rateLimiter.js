import rateLimit from 'express-rate-limit';
import { ENV } from '../config/env.js';

/**
 * General API rate limiter for public health and count endpoints.
 */
export const publicLimiter = rateLimit({
  windowMs: ENV.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000,
  max: ENV.RATE_LIMIT_PUBLIC_MAX || 150,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => ENV.NODE_ENV === 'test',
  message: {
    success: false,
    message: 'Too many requests. Please wait a moment before trying again.',
    errorCode: 'RATE_LIMIT_EXCEEDED',
  },
});

/**
 * Strict rate limiter for pledge commitment submissions.
 * Prevents spamming and automated abuse on public pledge endpoints.
 */
export const pledgeSubmissionLimiter = rateLimit({
  windowMs: ENV.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000,
  max: ENV.RATE_LIMIT_PLEDGE_MAX || 15,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => ENV.NODE_ENV === 'test',
  message: {
    success: false,
    message: 'Too many pledge submissions from this network. Please wait a few minutes before trying again.',
    errorCode: 'RATE_LIMIT_EXCEEDED',
  },
});

/**
 * Dedicated rate limiter for certificate verification lookups.
 * Allows legitimate verification while preventing brute-force enumeration.
 */
export const verifyLimiter = rateLimit({
  windowMs: ENV.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000,
  max: ENV.RATE_LIMIT_VERIFY_MAX || 60,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => ENV.NODE_ENV === 'test',
  message: {
    success: false,
    verified: false,
    message: 'Too many certificate verification requests. Please try again in a few minutes.',
    errorCode: 'RATE_LIMIT_EXCEEDED',
  },
});

// Backward compatibility alias
export const generalLimiter = publicLimiter;

export default {
  publicLimiter,
  pledgeSubmissionLimiter,
  verifyLimiter,
  generalLimiter,
};
