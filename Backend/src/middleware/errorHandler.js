import { ZodError } from 'zod';
import { ENV } from '../config/env.js';

/**
 * 404 Not Found Middleware
 */
export function notFoundHandler(req, res, next) {
  res.status(404).json({
    success: false,
    message: 'Resource not found.',
    errorCode: 'NOT_FOUND',
  });
}

/**
 * Centralized Application Error Handling Middleware
 * Ensures internal paths, database details, stack traces, and credentials are never exposed to clients.
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
    const message = firstIssue ? firstIssue.message : 'Please check the submitted information.';
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
      message: 'Please check the submitted information.',
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

  // CORS policy errors
  if (err.message && err.message.includes('CORS policy')) {
    return res.status(403).json({
      success: false,
      message: 'Cross-origin request forbidden.',
      errorCode: 'CORS_FORBIDDEN',
    });
  }

  // Log server internal errors safely server-side
  console.error('[ErrorHandler] Internal error:', {
    message: err.message,
    url: req.originalUrl,
    method: req.method,
    stack: ENV.NODE_ENV !== 'production' ? err.stack : undefined,
  });

  const statusCode = err.status || err.statusCode || 500;
  const safeMessage =
    statusCode >= 500
      ? 'Something went wrong. Please try again later.'
      : err.message || 'Request failed.';

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
