const redis = require('redis');
const config = require('./config');
const logger = require('../utils/logger');

/**
 * Redis client manager
 */
class RedisManager {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  /**
   * Initialize Redis client
   */
  async connect() {
    if (!config.services.redis.enabled) {
      logger.info('Redis is disabled');
      return null;
    }

    try {
      this.client = redis.createClient({
        url: config.services.redis.url,
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              logger.error('Redis max retries reached');
              return new Error('Redis max retries reached');
            }
            return Math.min(retries * 100, 3000);
          }
        }
      });

      this.client.on('connect', () => {
        logger.info('Redis connected');
        this.isConnected = true;
      });

      this.client.on('error', (err) => {
        logger.error('Redis error:', err);
        this.isConnected = false;
      });

      this.client.on('end', () => {
        logger.warn('Redis connection ended');
        this.isConnected = false;
      });

      await this.client.connect();
      
      return this.client;
    } catch (error) {
      logger.error('Redis connection failed:', error);
      return null;
    }
  }

  /**
   * Get cached value
   */
  async get(key) {
    if (!this.isConnected) return null;
    
    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Redis get error:', error);
      return null;
    }
  }

  /**
   * Set cached value
   */
  async set(key, value, ttl = 300) {
    if (!this.isConnected) return false;
    
    try {
      await this.client.setEx(key, ttl, JSON.stringify(value));
      return true;
    } catch (error) {
      logger.error('Redis set error:', error);
      return false;
    }
  }

  /**
   * Delete cached value
   */
  async delete(key) {
    if (!this.isConnected) return false;
    
    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      logger.error('Redis delete error:', error);
      return false;
    }
  }

  /**
   * Clear all cache
   */
  async clear() {
    if (!this.isConnected) return false;
    
    try {
      await this.client.flushAll();
      return true;
    } catch (error) {
      logger.error('Redis clear error:', error);
      return false;
    }
  }

  /**
   * Disconnect from Redis
   */
  async disconnect() {
    if (this.client && this.isConnected) {
      await this.client.quit();
      this.isConnected = false;
      logger.info('Redis disconnected');
    }
  }
}

module.exports = new RedisManager();