
const winston = require('winston');
const path = require('path');
const fs = require('fs');
const config = require('../config/config');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

/**
 * Safe JSON stringify that handles circular references and axios noise.
 * Never throws.
 */
function safeStringify(obj, indent = 2) {
  if (obj === null || obj === undefined) return '';
  if (typeof obj !== 'object') return String(obj);

  const seen = new WeakSet();
  try {
    return JSON.stringify(
      obj,
      (key, value) => {
        // Drop axios internals that cause circular refs
        if (
          key === 'agent' ||
          key === 'socket' ||
          key === 'sockets' ||
          key === '_httpMessage' ||
          key === 'config' ||
          key === 'request' ||
          key === 'response' ||
          key === '_header' ||
          key === 'req' ||
          key === 'res'
        ) {
          return undefined;
        }
        if (typeof value === 'object' && value !== null) {
          if (seen.has(value)) return '[Circular]';
          seen.add(value);
        }
        return value;
      },
      indent
    );
  } catch (e) {
    return `[Unserializable: ${e.message}]`;
  }
}

// File format (JSON, safe for large logs)
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Console format (readable)
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss.SSS' }),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    // Remove winston internals from meta
    const cleanMeta = { ...meta };
    delete cleanMeta.service;
    delete cleanMeta.environment;
    delete cleanMeta.splat;
    delete cleanMeta[Symbol.for('level')];
    delete cleanMeta[Symbol.for('message')];
    delete cleanMeta[Symbol.for('splat')];

    let metaStr = '';
    if (Object.keys(cleanMeta).length > 0) {
      metaStr = `\n${safeStringify(cleanMeta)}`;
    }

    let out = `${timestamp} [${level}]: ${message}${metaStr}`;
    if (stack) {
      out += `\n${stack}`;
    }
    return out;
  })
);

// Create logger instance
const logger = winston.createLogger({
  level: config.logging?.level || 'info',
  format: logFormat,
  defaultMeta: {
    service: 'secure-rag-backend',
    environment: config.env
  },
  transports: [
    // Console
    new winston.transports.Console({
      format: config.isProduction ? logFormat : consoleFormat
    }),

    // Error log file
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: config.logging?.maxSize || '10m',
      maxFiles: config.logging?.maxFiles || 10
    }),

    // Combined log file
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: config.logging?.maxSize || '10m',
      maxFiles: config.logging?.maxFiles || 10
    })
  ],
  exitOnError: false
});

// ---- Helper functions ----

logger.logRequest = (req, res, responseTime) => {
  logger.info('API Request', {
    method: req.method,
    url: req.originalUrl,
    status: res.statusCode,
    responseTime: `${responseTime}ms`,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    userId: req.user?.id,
    requestId: req.requestId
  });
};

logger.logError = (error, req = null) => {
  logger.error('Application Error', {
    message: error?.message,
    stack: error?.stack,
    name: error?.name,
    requestId: req?.requestId,
    url: req?.originalUrl,
    method: req?.method,
    userId: req?.user?.id
  });
};

logger.logSecurityEvent = (event, req = null) => {
  logger.warn('Security Event', {
    event,
    requestId: req?.requestId,
    ip: req?.ip,
    userId: req?.user?.id,
    timestamp: new Date().toISOString()
  });
};

logger.logAudit = (action, details, req = null) => {
  logger.info('Audit', {
    action,
    details,
    requestId: req?.requestId,
    userId: req?.user?.id,
    timestamp: new Date().toISOString()
  });
};

module.exports = logger;