const crypto = require('crypto');
const logger = require('./logger');

/**
 * Common helper functions
 */
const helpers = {
  /**
   * Generate random string
   */
  generateRandomString(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  },

  /**
   * Generate UUID
   */
  generateUUID() {
    return crypto.randomUUID();
  },

  /**
   * Hash string
   */
  hashString(data) {
    return crypto
      .createHash('sha256')
      .update(data)
      .digest('hex');
  },

  /**
   * Sleep function
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  /**
   * Retry function with exponential backoff
   */
  async retry(fn, options = {}) {
    const {
      maxRetries = 3,
      initialDelay = 1000,
      maxDelay = 10000,
      backoffFactor = 2
    } = options;

    let lastError;
    let delay = initialDelay;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        
        if (attempt < maxRetries) {
          logger.warn(`Retry attempt ${attempt}/${maxRetries} failed:`, error.message);
          await this.sleep(delay);
          delay = Math.min(delay * backoffFactor, maxDelay);
        }
      }
    }

    throw lastError;
  },

  /**
   * Sanitize object for logging
   */
  sanitizeForLogging(data) {
    if (!data) return null;

    const sensitiveFields = [
      'password',
      'token',
      'refreshToken',
      'accessToken',
      'secret',
      'apiKey',
      'authorization',
      'cookie',
      'encryptedContent',
      'encryptedEmbedding'
    ];

    const sanitized = { ...data };

    Object.keys(sanitized).forEach(key => {
      if (sensitiveFields.includes(key)) {
        sanitized[key] = '[REDACTED]';
      }
    });

    return sanitized;
  },

  /**
   * Format date
   */
  formatDate(date, format = 'YYYY-MM-DD HH:mm:ss') {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');

    return format
      .replace('YYYY', year)
      .replace('MM', month)
      .replace('DD', day)
      .replace('HH', hours)
      .replace('mm', minutes)
      .replace('ss', seconds);
  },

  /**
   * Parse pagination parameters
   */
  parsePagination(query) {
    const page = Math.max(1, parseInt(query.page) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(query.limit) || 20));
    
    return {
      page,
      limit,
      skip: (page - 1) * limit
    };
  },

  /**
   * Parse sort parameters
   */
  parseSort(query, defaultSort = { createdAt: -1 }) {
    if (!query.sortBy) return defaultSort;

    const sortOrder = query.sortOrder === 'asc' ? 1 : -1;
    return {
      [query.sortBy]: sortOrder
    };
  },

  /**
   * Validate email format
   */
  isValidEmail(email) {
    const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    return emailRegex.test(email);
  },

  /**
   * Validate URL format
   */
  isValidURL(url) {
    try {
      new URL(url);
      return true;
    } catch (error) {
      return false;
    }
  },

  /**
   * Truncate string
   */
  truncateString(str, maxLength = 100) {
    if (!str || str.length <= maxLength) return str;
    return str.substring(0, maxLength) + '...';
  },

  /**
   * Deep clone object
   */
  deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  },

  /**
   * Check if object is empty
   */
  isEmptyObject(obj) {
    return Object.keys(obj).length === 0;
  },

  /**
   * Remove undefined values from object
   */
  removeUndefined(obj) {
    return Object.keys(obj).reduce((acc, key) => {
      if (obj[key] !== undefined && obj[key] !== null) {
        acc[key] = obj[key];
      }
      return acc;
    }, {});
  }
};

module.exports = helpers;