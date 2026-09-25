const logger = require('./logger');
const config = require('../config/config');

/**
 * Custom error class for API errors
 */
class APIError extends Error {
  constructor(message, statusCode, code = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Not found error
 */
class NotFoundError extends APIError {
  constructor(message = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

/**
 * Validation error
 */
class ValidationError extends APIError {
  constructor(message = 'Validation failed', errors = []) {
    super(message, 400, 'VALIDATION_ERROR');
    this.errors = errors;
  }
}

/**
 * Authentication error
 */
class AuthenticationError extends APIError {
  constructor(message = 'Authentication failed') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

/**
 * Authorization error
 */
class AuthorizationError extends APIError {
  constructor(message = 'Insufficient permissions') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

/**
 * Conflict error
 */
class ConflictError extends APIError {
  constructor(message = 'Resource already exists') {
    super(message, 409, 'CONFLICT_ERROR');
  }
}

/**
 * Rate limit error
 */
class RateLimitError extends APIError {
  constructor(message = 'Too many requests') {
    super(message, 429, 'RATE_LIMIT_ERROR');
  }
}

/**
 * Global error handler middleware
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error
  logger.logError(err, req);

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = `Resource not found with id: ${err.value}`;
    error = new NotFoundError(message);
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const message = `Duplicate field value: ${field}. Please use another value.`;
    error = new ConflictError(message);
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => ({
      field: e.path,
      message: e.message
    }));
    error = new ValidationError('Validation failed', errors);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error = new AuthenticationError('Invalid token');
  }

  if (err.name === 'TokenExpiredError') {
    error = new AuthenticationError('Token expired');
  }

  // Multer errors
  if (err.name === 'MulterError') {
    const message = err.code === 'LIMIT_FILE_SIZE' 
      ? 'File size too large' 
      : err.message;
    error = new APIError(message, 400, 'FILE_UPLOAD_ERROR');
  }

  // Send response
  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || 'Internal server error',
    code: error.code || 'INTERNAL_ERROR',
    errors: error.errors || null,
    requestId: req.requestId,
    timestamp: new Date().toISOString(),
    ...(config.isDevelopment && { stack: err.stack })
  });
};

/**
 * Async handler wrapper to avoid try-catch blocks
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Not found handler
 */
const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.originalUrl}`,
    code: 'ROUTE_NOT_FOUND',
    requestId: req.requestId,
    timestamp: new Date().toISOString()
  });
};

module.exports = {
  APIError,
  NotFoundError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  ConflictError,
  RateLimitError,
  errorHandler,
  asyncHandler,
  notFoundHandler
};