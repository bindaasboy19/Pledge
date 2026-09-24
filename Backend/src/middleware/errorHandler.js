import { ZodError } from 'zod';
import { ENV } from '../config/env.js';

/**
 * 404 Not Found Middleware
 */
export function notFoundHandler(req, res, next) {
  res.status(404).json({
    success: false,
    message: `Resource not found: ${req.method} ${req.originalUrl}`,
    errorCode: 'NOT_FOUND',
  });
}

/**
 * Centralized Application Error Handling Middleware
 */
export function errorHandler(err, req, res, next) {
  // Syntax error in JSON payload
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      message: 'Malformed JSON payload received.',
      errorCode: 'INVALID_JSON',
    });
  }

  // Zod schema validation errors
  if (err instanceof ZodError) {
    const firstIssue = err.issues[0];
    const message = firstIssue ? firstIssue.message : 'Invalid request data.';
    const details = err.issues.map((i) => ({
      field: i.path.join('.'),
      message: i.message,
    }));

    return res.status(400).json({
      success: false,
      message,
      errorCode: 'VALIDATION_ERROR',
      details,
    });
  }

  // Mongoose validation errors
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({
      success: false,
      message: messages[0] || 'Database validation failed.',
      errorCode: 'VALIDATION_ERROR',
      details: messages,
    });
  }

  // Mongoose bad ObjectId / CastError
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid identifier format.',
      errorCode: 'INVALID_ID',
    });
  }

  // Log server internal errors
  console.error('[ErrorHandler] Unhandled error:', {
    message: err.message,
    stack: ENV.NODE_ENV === 'development' ? err.stack : undefined,
    url: req.originalUrl,
    method: req.method,
  });

  const statusCode = err.status || err.statusCode || 500;
  const safeMessage =
    statusCode >= 500 && ENV.NODE_ENV === 'production'
      ? 'An unexpected error occurred. Please try again shortly.'
      : err.message || 'Internal server error.';

  return res.status(statusCode).json({
    success: false,
    message: safeMessage,
    errorCode: err.errorCode || 'INTERNAL_SERVER_ERROR',
  });
}

export default {
  notFoundHandler,
  errorHandler,
};
