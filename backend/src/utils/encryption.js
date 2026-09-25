const crypto = require('crypto');
const config = require('../config/config');
const logger = require('./logger');

/**
 * Encryption utility for secure data handling
 */
class EncryptionUtil {
  constructor() {
    this.algorithm = config.encryption.algorithm;
    this.keyLength = config.encryption.keyLength;
    this.ivLength = config.encryption.ivLength;
    this.saltLength = config.encryption.saltLength;
    this.iterations = config.encryption.iterations;
  }

  /**
   * Generate encryption key
   */
  generateKey() {
    return crypto.randomBytes(this.keyLength);
  }

  /**
   * Generate IV
   */
  generateIV() {
    return crypto.randomBytes(this.ivLength);
  }

  /**
   * Generate salt
   */
  generateSalt() {
    return crypto.randomBytes(this.saltLength);
  }

  /**
   * Derive key from password using PBKDF2
   */
  deriveKey(password, salt) {
    return crypto.pbkdf2Sync(
      password,
      salt,
      this.iterations,
      this.keyLength,
      'sha256'
    );
  }

  /**
   * Encrypt data
   */
  encrypt(data, key = null) {
    try {
      const encryptionKey = key || this.generateKey();
      const iv = this.generateIV();
      
      const cipher = crypto.createCipheriv(
        this.algorithm,
        encryptionKey,
        iv
      );
      
      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag();
      
      return {
        ciphertext: encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex'),
        key: encryptionKey.toString('hex')
      };
    } catch (error) {
      logger.error('Encryption failed:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt data
   */
  decrypt(encryptedData, key, iv, authTag) {
    try {
      const decipher = crypto.createDecipheriv(
        this.algorithm,
        Buffer.from(key, 'hex'),
        Buffer.from(iv, 'hex')
      );
      
      decipher.setAuthTag(Buffer.from(authTag, 'hex'));
      
      let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      logger.error('Decryption failed:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Encrypt JSON object
   */
  encryptJSON(data, key = null) {
    const jsonString = JSON.stringify(data);
    return this.encrypt(jsonString, key);
  }

  /**
   * Decrypt JSON object
   */
  decryptJSON(encryptedData, key, iv, authTag) {
    const decryptedString = this.decrypt(encryptedData, key, iv, authTag);
    return JSON.parse(decryptedString);
  }

  /**
   * Hash data
   */
  hash(data) {
    return crypto
      .createHash('sha256')
      .update(data)
      .digest('hex');
  }

  /**
   * Generate random token
   */
  generateToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Generate UUID
   */
  generateUUID() {
    return crypto.randomUUID();
  }
}

module.exports = new EncryptionUtil();