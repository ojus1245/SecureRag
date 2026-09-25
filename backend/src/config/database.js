const mongoose = require('mongoose');
const config = require('./config');
const logger = require('../utils/logger');

/**
 * Database connection manager
 */
class DatabaseManager {
  constructor() {
    this.isConnected = false;
    this.retryCount = 0;
    this.maxRetries = 5;
    this.retryDelay = 5000; // 5 seconds
  }

  /**
   * Connect to MongoDB
   */
  async connect() {
    try {
      logger.info('Connecting to MongoDB...');

      // Set mongoose options
      mongoose.set('strictQuery', false);
      
      // Connect to MongoDB
      await mongoose.connect(config.mongodb.uri, config.mongodb.options);

      this.isConnected = true;
      this.retryCount = 0;
      
      logger.info('✅ MongoDB connected successfully');
      logger.info(`Database: ${mongoose.connection.name}`);
      logger.info(`Host: ${mongoose.connection.host}`);

      // Set up connection event handlers
      this.setupEventHandlers();

      // Create indexes
      await this.createIndexes();

      // Seed default roles
      await this.seedDefaultRoles();

      return mongoose.connection;
    } catch (error) {
      logger.error('MongoDB connection failed:', error);
      
      // Retry logic
      if (this.retryCount < this.maxRetries) {
        this.retryCount++;
        logger.info(`Retrying connection (${this.retryCount}/${this.maxRetries}) in ${this.retryDelay/1000}s...`);
        
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        return this.connect();
      }
      
      logger.error('Max retries reached. Exiting...');
      process.exit(1);
    }
  }

  /**
   * Set up connection event handlers
   */
  setupEventHandlers() {
    mongoose.connection.on('connected', () => {
      logger.info('Mongoose connected to MongoDB');
    });

    mongoose.connection.on('error', (err) => {
      logger.error('Mongoose connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('Mongoose disconnected from MongoDB');
      this.isConnected = false;
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('Mongoose reconnected to MongoDB');
      this.isConnected = true;
    });

    // Handle process termination
    process.on('SIGINT', async () => {
      await this.disconnect();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      await this.disconnect();
      process.exit(0);
    });
  }

  /**
   * Create database indexes
   */
  async createIndexes() {
    try {
      logger.info('Creating database indexes...');

      const User = require('../models/User');
      const Role = require('../models/Role');
      const Document = require('../models/Document');
      const DocumentACL = require('../models/DocumentACL');
      const AuditLog = require('../models/AuditLog');

      // User indexes
      await User.collection.createIndex({ email: 1 }, { unique: true });
      await User.collection.createIndex({ username: 1 }, { unique: true });
      await User.collection.createIndex({ department: 1 });
      await User.collection.createIndex({ role: 1 });
      await User.collection.createIndex({ isActive: 1 });

      // Role indexes
      await Role.collection.createIndex({ name: 1 }, { unique: true });
      await Role.collection.createIndex({ isActive: 1 });

      // Document indexes
      await Document.collection.createIndex({ owner: 1, createdAt: -1 });
      await Document.collection.createIndex({ department: 1, classification: 1 });
      await Document.collection.createIndex({ tags: 1 });
      await Document.collection.createIndex({ status: 1 });
      await Document.collection.createIndex({ title: 'text', content: 'text' });
      await Document.collection.createIndex({ vectorId: 1 }, { unique: true });

      // DocumentACL indexes
      await DocumentACL.collection.createIndex({ document: 1, user: 1 }, { unique: true });
      await DocumentACL.collection.createIndex({ user: 1, isActive: 1 });
      await DocumentACL.collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

      // AuditLog indexes
      await AuditLog.collection.createIndex({ timestamp: -1 });
      await AuditLog.collection.createIndex({ userId: 1, action: 1 });
      await AuditLog.collection.createIndex({ resourceType: 1, resourceId: 1 });
      await AuditLog.collection.createIndex({ status: 1, timestamp: -1 });

      logger.info('✅ Database indexes created successfully');
    } catch (error) {
      logger.error('Failed to create indexes:', error);
      // Don't throw - indexes can be created later
    }
  }

  /**
   * Seed default roles
   */
  async seedDefaultRoles() {
    try {
      logger.info('Verifying default roles and permissions...');
      const Role = require('../models/Role');
      const defaultRoles = Role.getDefaultRoles();

      for (const roleData of defaultRoles) {
        await Role.updateOne(
          { name: roleData.name },
          { $set: roleData },
          { upsert: true }
        );
      }

      logger.info('✅ Default roles verified and synchronized successfully');
    } catch (error) {
      logger.error('Failed to seed default roles:', error);
    }
  }

  /**
   * Disconnect from MongoDB
   */
  async disconnect() {
    try {
      if (this.isConnected) {
        await mongoose.disconnect();
        this.isConnected = false;
        logger.info('Disconnected from MongoDB');
      }
    } catch (error) {
      logger.error('Failed to disconnect from MongoDB:', error);
      throw error;
    }
  }

  /**
   * Check database health
   */
  async checkHealth() {
    try {
      if (!this.isConnected) {
        return { status: 'disconnected' };
      }

      const admin = mongoose.connection.db.admin();
      const result = await admin.ping();
      
      return {
        status: 'connected',
        ping: result,
        database: mongoose.connection.name,
        host: mongoose.connection.host,
        port: mongoose.connection.port
      };
    } catch (error) {
      logger.error('Database health check failed:', error);
      return {
        status: 'error',
        error: error.message
      };
    }
  }
}

module.exports = new DatabaseManager();