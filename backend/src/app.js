const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const path = require('path');
const config = require('./config/config');
const logger = require('./utils/logger');
const { errorHandler, notFoundHandler } = require('./utils/errorHandler');
const { auditLogger } = require('./middleware/auditLogger');

// Import routes
const authRoutes = require('./routes/auth.routes');
const documentRoutes = require('./routes/document.routes');
const chatRoutes = require('./routes/chat.routes');
const userRoutes = require('./routes/user.routes');
const auditRoutes = require('./routes/audit.routes');

// Create Express app
const app = express();

/**
 * Middleware Setup
 */

// Trust proxy (for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// Security headers
app.use(helmet(config.security.helmet));

// Enable CORS
app.use(cors(config.cors));

// Compression
app.use(compression());

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Helper for safe in-place XSS sanitization
const sanitizeXSS = (data) => {
  if (!data) return data;
  if (typeof data === 'string') {
    return data.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  if (Array.isArray(data)) {
    for (let i = 0; i < data.length; i++) {
      data[i] = sanitizeXSS(data[i]);
    }
    return data;
  }
  if (typeof data === 'object') {
    for (const key of Object.keys(data)) {
      data[key] = sanitizeXSS(data[key]);
    }
  }
  return data;
};

// Data sanitization (NoSQL injection and XSS)
app.use((req, res, next) => {
  if (req.body) {
    mongoSanitize.sanitize(req.body);
    sanitizeXSS(req.body);
  }
  if (req.params) {
    mongoSanitize.sanitize(req.params);
    sanitizeXSS(req.params);
  }
  if (req.query) {
    mongoSanitize.sanitize(req.query);
    sanitizeXSS(req.query);
  }
  next();
});
app.use(hpp());

// Rate limiting
if (config.features.enableRateLimiting) {
  const limiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.max,
    standardHeaders: config.rateLimit.standardHeaders,
    legacyHeaders: config.rateLimit.legacyHeaders,
    message: {
      success: false,
      message: 'Too many requests, please try again later.',
      code: 'RATE_LIMIT_EXCEEDED'
    },
    skip: (req) => req.method === 'OPTIONS'
  });
  
  app.use(config.apiPrefix, limiter);
}

// Audit logging
if (config.features.enableAuditLogging) {
  app.use(auditLogger);
}

// Static files (if any)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

/**
 * API Routes
 */
app.use(`${config.apiPrefix}/auth`, authRoutes);
app.use(`${config.apiPrefix}/documents`, documentRoutes);
app.use(`${config.apiPrefix}/chat`, chatRoutes);
app.use(`${config.apiPrefix}/users`, userRoutes);
app.use(`${config.apiPrefix}/audit`, auditRoutes);

/**
 * Health Check Endpoint
 */
app.get('/health', async (req, res) => {
  const healthStatus = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
    services: {
      database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      aiService: 'unknown' // Will be updated by health check service
    }
  };

  // Check database connection
  if (mongoose.connection.readyState === 1) {
    healthStatus.services.database = 'connected';
  } else {
    healthStatus.services.database = 'disconnected';
    healthStatus.status = 'DEGRADED';
  }

  res.status(healthStatus.status === 'OK' ? 200 : 503).json(healthStatus);
});

/**
 * API Documentation endpoint (optional)
 */
app.get(`${config.apiPrefix}/docs`, (req, res) => {
  res.json({
    success: true,
    data: {
      name: 'Secure Enterprise RAG Knowledge Base API',
      version: '1.0.0',
      endpoints: {
        auth: `${config.apiPrefix}/auth`,
        documents: `${config.apiPrefix}/documents`,
        chat: `${config.apiPrefix}/chat`,
        users: `${config.apiPrefix}/users`,
        audit: `${config.apiPrefix}/audit`
      }
    }
  });
});

/**
 * 404 Handler
 */
app.use(notFoundHandler);

/**
 * Error Handler
 */
app.use(errorHandler);

/**
 * Graceful shutdown
 */
const gracefulShutdown = async (signal) => {
  logger.info(`${signal} received. Starting graceful shutdown...`);
  
  // Close server
  if (app.server) {
    app.server.close(() => {
      logger.info('HTTP server closed');
    });
  }

  // Close database connection
  try {
    await mongoose.connection.close();
    logger.info('Database connection closed');
  } catch (error) {
    logger.error('Failed to close database connection:', error);
  }

  process.exit(0);
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

module.exports = app;