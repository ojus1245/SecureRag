const Document = require('../models/Document');
const DocumentACL = require('../models/DocumentACL');
const User = require('../models/User');
const crypto = require('crypto');
const axios = require('axios');
const config = require('../config/config');
const logger = require('../utils/logger');
const { logAuditEvent } = require('../middleware/auditLogger');

class DocumentService {
  constructor() {
    this.aiServiceUrl = config.aiService.url;
    this.encryptionKey = config.encryption.key;
    this.algorithm = 'aes-256-gcm';
  }

  /**
   * Process document for storage
   * Encrypts content and generates embeddings
   */
  async processDocument(documentData) {
    try {
      const {
        title,
        content,
        department,
        classification,
        tags,
        fileType,
        metadata = {}
      } = documentData;

      // Generate content hash
      const contentHash = this.generateContentHash(content);

      // Encrypt content
      const encryptedContent = await this.encryptContent(content);

      // Get embeddings from AI service
      const embedding = await this.getEmbedding(content);

      // Encrypt embedding
      const encryptedEmbedding = await this.encryptEmbedding(embedding);

      // Generate vector ID
      const vectorId = crypto.randomUUID();

      return {
        title,
        content,
        contentHash,
        encryptedContent: encryptedContent.ciphertext,
        encryptionKeyId: encryptedContent.keyId,
        encryptedEmbedding: encryptedEmbedding.ciphertext,
        embeddingKeyId: encryptedEmbedding.keyId,
        vectorId,
        embeddingModel: 'sentence-transformers/all-MiniLM-L6-v2',
        fileType: fileType || 'txt',
        fileSize: Buffer.byteLength(content, 'utf8'),
        mimeType: this.getMimeType(fileType),
        department,
        classification: classification || 'internal',
        tags: tags || [],
        metadata: {
          ...metadata,
          processedAt: new Date().toISOString(),
          encryptionVersion: '1.0',
          embeddingDimensions: embedding.length
        }
      };
    } catch (error) {
      logger.error('Process document error:', error);
      throw error;
    }
  }

  /**
   * Generate content hash
   */
  generateContentHash(content) {
    return crypto
      .createHash('sha256')
      .update(content)
      .digest('hex');
  }

  /**
   * Encrypt document content
   */
  async encryptContent(content) {
    try {
      // Generate encryption key
      const key = this.generateEncryptionKey();
      const iv = crypto.randomBytes(16);

      // Create cipher
      const cipher = crypto.createCipheriv(this.algorithm, key, iv);

      // Encrypt content
      let encrypted = cipher.update(content, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      // Get auth tag
      const authTag = cipher.getAuthTag();

      // Generate key ID
      const keyId = crypto.randomUUID();

      // Store key (in production, use KMS)
      await this.storeEncryptionKey(keyId, key);

      return {
        ciphertext: encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex'),
        keyId
      };
    } catch (error) {
      logger.error('Encrypt content error:', error);
      throw error;
    }
  }

  /**
   * Decrypt document content
   */
  async decryptContent(encryptedContent, keyId, iv, authTag) {
    try {
      // Retrieve encryption key
      const key = await this.retrieveEncryptionKey(keyId);

      // Create decipher
      const decipher = crypto.createDecipheriv(
        this.algorithm,
        key,
        Buffer.from(iv, 'hex')
      );

      // Set auth tag
      decipher.setAuthTag(Buffer.from(authTag, 'hex'));

      // Decrypt content
      let decrypted = decipher.update(encryptedContent, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      logger.error('Decrypt content error:', error);
      throw error;
    }
  }

  /**
   * Decrypt document content (simplified for controller use)
   */
  async decryptDocumentContent(encryptedContent, userId) {
    try {
      // In production, this would retrieve the actual encrypted data
      // For now, return a placeholder decryption
      return encryptedContent;
    } catch (error) {
      logger.error('Decrypt document content error:', error);
      throw error;
    }
  }

  /**
   * Get embedding from AI service
   */
  async getEmbedding(content) {
    try {
      const response = await axios.post(`${this.aiServiceUrl}/embeddings`, {
        text: content,
        model: 'sentence-transformers/all-MiniLM-L6-v2'
      }, {
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.data || !response.data.embedding) {
        throw new Error('Invalid embedding response from AI service');
      }

      return response.data.embedding;
    } catch (error) {
      logger.error('Get embedding error:', error);
      throw new Error('Failed to generate embedding: ' + error.message);
    }
  }

  /**
   * Encrypt embedding vector
   */
  async encryptEmbedding(embedding) {
    try {
      // Convert embedding to string for encryption
      const embeddingString = JSON.stringify(embedding);

      // Encrypt embedding string
      const encrypted = await this.encryptContent(embeddingString);

      return encrypted;
    } catch (error) {
      logger.error('Encrypt embedding error:', error);
      throw error;
    }
  }

  /**
   * Decrypt embedding vector
   */
  async decryptEmbedding(encryptedEmbedding, keyId, iv, authTag) {
    try {
      // Decrypt embedding string
      const decryptedString = await this.decryptContent(
        encryptedEmbedding,
        keyId,
        iv,
        authTag
      );

      // Parse embedding array
      return JSON.parse(decryptedString);
    } catch (error) {
      logger.error('Decrypt embedding error:', error);
      throw error;
    }
  }

  /**
   * Generate encryption key
   */
  generateEncryptionKey() {
    return crypto.randomBytes(32); // 256-bit key
  }

  /**
   * Store encryption key (mock - in production use KMS)
   */
  async storeEncryptionKey(keyId, key) {
    try {
      // In production, store in AWS KMS, Azure Key Vault, or HashiCorp Vault
      // For now, just log
      logger.debug(`Encryption key stored: ${keyId}`);
      return true;
    } catch (error) {
      logger.error('Store encryption key error:', error);
      throw error;
    }
  }

  /**
   * Retrieve encryption key (mock - in production use KMS)
   */
  async retrieveEncryptionKey(keyId) {
    try {
      // In production, retrieve from KMS
      // For now, return a placeholder key
      return crypto.createHash('sha256').update(keyId).digest();
    } catch (error) {
      logger.error('Retrieve encryption key error:', error);
      throw error;
    }
  }

  /**
   * Get MIME type from file type
   */
  getMimeType(fileType) {
    const mimeTypes = {
      'pdf': 'application/pdf',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'txt': 'text/plain',
      'md': 'text/markdown',
      'html': 'text/html',
      'other': 'application/octet-stream'
    };
    return mimeTypes[fileType] || mimeTypes.other;
  }

  /**
   * Validate document access
   */
  async validateDocumentAccess(documentId, userId, requiredPermission = 'read') {
    try {
      const document = await Document.findById(documentId);

      if (!document) {
        return { hasAccess: false, reason: 'Document not found' };
      }

      // Check if user is owner
      if (document.owner.equals(userId)) {
        return { hasAccess: true, accessType: 'owner' };
      }

      // Check ACL
      const aclEntry = await DocumentACL.findOne({
        document: documentId,
        user: userId,
        isActive: true,
        $or: [
          { expiresAt: { $gt: new Date() } },
          { expiresAt: null }
        ]
      });

      if (aclEntry && aclEntry.permissions.includes(requiredPermission)) {
        return { hasAccess: true, accessType: 'acl' };
      }

      return { hasAccess: false, reason: 'No access permission' };
    } catch (error) {
      logger.error('Validate document access error:', error);
      throw error;
    }
  }

  /**
   * Share document with user
   */
  async shareDocument(documentId, userId, permissions, grantedBy, expiresAt = null) {
    try {
      // Check if target user exists
      const targetUser = await User.findById(userId);
      if (!targetUser) {
        throw new Error('Target user not found');
      }

      // Create or update ACL
      let acl = await DocumentACL.findOne({
        document: documentId,
        user: userId
      });

      if (acl) {
        // Update existing ACL
        acl.permissions = permissions;
        acl.expiresAt = expiresAt;
        acl.grantedBy = grantedBy;
        acl.grantedAt = new Date();
        acl.isActive = true;
      } else {
        // Create new ACL
        acl = new DocumentACL({
          document: documentId,
          user: userId,
          permissions,
          expiresAt,
          grantedBy,
          grantedAt: new Date(),
          isActive: true
        });
      }

      await acl.save();

      // Log share event
      await logAuditEvent({
        userId: grantedBy,
        action: 'DOCUMENT_SHARE',
        resourceType: 'document',
        resourceId: documentId,
        details: {
          sharedWith: userId,
          permissions,
          timestamp: new Date().toISOString()
        },
        status: 'success'
      });

      return acl;
    } catch (error) {
      logger.error('Share document error:', error);
      throw error;
    }
  }

  /**
   * Remove document share
   */
  async removeDocumentShare(documentId, userId) {
    try {
      const result = await DocumentACL.findOneAndDelete({
        document: documentId,
        user: userId
      });

      return result;
    } catch (error) {
      logger.error('Remove document share error:', error);
      throw error;
    }
  }

  /**
   * Get document statistics
   */
  async getDocumentStats(userId) {
    try {
      const stats = await Document.aggregate([
        {
          $facet: {
            totalDocuments: [{ $count: 'count' }],
            byClassification: [
              {
                $group: {
                  _id: '$classification',
                  count: { $sum: 1 }
                }
              }
            ],
            byDepartment: [
              {
                $group: {
                  _id: '$department',
                  count: { $sum: 1 }
                }
              }
            ],
            recentUploads: [
              { $sort: { createdAt: -1 } },
              { $limit: 10 },
              {
                $project: {
                  title: 1,
                  classification: 1,
                  createdAt: 1
                }
              }
            ]
          }
        }
      ]);

      return stats[0];
    } catch (error) {
      logger.error('Get document stats error:', error);
      throw error;
    }
  }
}

module.exports = new DocumentService();