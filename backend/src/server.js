const app = require('./app');
const config = require('./config/config');
const logger = require('./utils/logger');
const databaseManager = require('./config/database');
const redisManager = require('./config/redis');
const { WebSocketServer } = require('ws');

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

    // Initialize WebSocket server
    const wss = new WebSocketServer({ server, path: '/ws' });
    app.wss = wss;

    const subscriptions = new Map();

    wss.on('connection', (ws) => {
      logger.info('WebSocket client connected');
      ws.isAlive = true;

      // Welcome message
      ws.send(JSON.stringify({
        type: 'connected',
        status: 'connected',
        message: 'Connected to Secure RAG WebSocket server',
        timestamp: new Date().toISOString()
      }));

      ws.on('pong', () => {
        ws.isAlive = true;
      });

      ws.on('message', (message) => {
        try {
          const parsed = JSON.parse(message.toString());
          if (parsed.type === 'ping') {
            ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
          } else if (parsed.type === 'subscribe' && parsed.channel) {
            if (!subscriptions.has(parsed.channel)) {
              subscriptions.set(parsed.channel, new Set());
            }
            subscriptions.get(parsed.channel).add(ws);
            ws.send(JSON.stringify({ type: 'subscribed', channel: parsed.channel }));
          } else if (parsed.type === 'unsubscribe' && parsed.channel) {
            if (subscriptions.has(parsed.channel)) {
              subscriptions.get(parsed.channel).delete(ws);
            }
          }
        } catch (e) {
          // ignore non-json
        }
      });

      ws.on('close', () => {
        logger.info('WebSocket client disconnected');
        for (const [channel, clients] of subscriptions.entries()) {
          clients.delete(ws);
          if (clients.size === 0) {
            subscriptions.delete(channel);
          }
        }
      });

      ws.on('error', (err) => {
        logger.warn('WebSocket client error:', err.message);
      });
    });

    app.broadcastToChannel = (channel, data) => {
      const clients = subscriptions.get(channel);
      if (clients) {
        const payload = JSON.stringify(data);
        for (const client of clients) {
          if (client.readyState === 1) { // 1 = OPEN
            client.send(payload);
          }
        }
      }
    };

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
