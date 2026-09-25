const app = require('./app');
const config = require('./config/config');
const logger = require('./utils/logger');
const databaseManager = require('./config/database');
const redisManager = require('./config/redis');

/**
 * Server startup
 */
const startServer = async () => {
  try {
    logger.info('Starting Secure Enterprise RAG Knowledge Base server...');
    logger.info(`Environment: ${config.env}`);
    logger.info(`Port: ${config.port}`);

    // Connect to database
    await databaseManager.connect();

    // Connect to Redis (if enabled)
    if (config.services.redis.enabled) {
      await redisManager.connect();
    }

    // Start HTTP server
    const server = app.listen(config.port, config.host, () => {
      logger.info(`🚀 Server running on http://${config.host}:${config.port}`);
      logger.info(`📚 API Documentation: http://${config.host}:${config.port}${config.apiPrefix}/docs`);
      logger.info(`❤️ Health Check: http://${config.host}:${config.port}/health`);
    });

    // Store server reference for graceful shutdown
    app.server = server;

    // Handle server errors
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        logger.error(`Port ${config.port} is already in use`);
        process.exit(1);
      }
      logger.error('Server error:', error);
    });

    // Handle process warnings
    process.on('warning', (warning) => {
      logger.warn('Process warning:', warning);
    });

    // Handle unhandled rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection:', {
        reason: reason?.message || reason,
        stack: reason?.stack
      });
      // Don't exit in development, exit in production
      if (config.isProduction) {
        process.exit(1);
      }
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      // Always exit on uncaught exception
      process.exit(1);
    });

    return server;
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start server
startServer();

module.exports = { startServer };