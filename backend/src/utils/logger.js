const winston = require('winston');
const path = require('path');
const fs = require('fs');
const config = require('../config/config');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Console format (more readable for development)
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss.SSS' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let metaStr = '';
    if (Object.keys(meta).length > 0) {
      metaStr = `\n${JSON.stringify(meta, null, 2)}`;
    }
    return `${timestamp} [${level}]: ${message}${metaStr}`;
  })
);

// Create logger instance
const logger = winston.createLogger({
  level: config.logging.level,
  format: logFormat,
  defaultMeta: {
    service: 'secure-rag-backend',
    environment: config.env
  },
  transports: [
    // Write all logs to console
    new winston.transports.Console({
      format: config.isProduction ? logFormat : consoleFormat
    }),
    
    // Write error logs to file
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: config.logging.maxSize || '10m',
      maxFiles: config.logging.maxFiles || 10
    }),
    
    // Write all logs to file
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: config.logging.maxSize || '10m',
      maxFiles: config.logging.maxFiles || 10
    })
  ],
  exitOnError: false
});

// Add request logging helper
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

// Add error logging helper
logger.logError = (error, req = null) => {
  logger.error('Application Error', {
    message: error.message,
    stack: error.stack,
    requestId: req?.requestId,
    url: req?.originalUrl,
    method: req?.method,
    userId: req?.user?.id
  });
};

// Add security event logger
logger.logSecurityEvent = (event, req = null) => {
  logger.warn('Security Event', {
    event,
    requestId: req?.requestId,
    ip: req?.ip,
    userId: req?.user?.id,
    timestamp: new Date().toISOString()
  });
};

// Add audit logger
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