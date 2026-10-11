const Document = require('../models/Document');
const DocumentACL = require('../models/DocumentACL');
const axios = require('axios');
const config = require('../config/config');
const logger = require('../utils/logger');
const { logAuditEvent } = require('../middleware/auditLogger');

class RAGService {
  constructor() {
    this.aiServiceUrl = config.aiService.url;
    this.retrievalTimeout = 30000;
    this.maxRetries = 3;
  }

  /**
   * Add document to RAG system
   */
  async addDocument(document) {
    try {
      const response = await axios.post(
        `${this.aiServiceUrl}/rag/documents`,
        {
          documentId: document._id,
          vectorId: document.vectorId,
          encryptedEmbedding: document.encryptedEmbedding,
          embeddingKeyId: document.embeddingKeyId,
          content: document.content,           // ✅ FIX: send raw content
          metadata: {
            title: document.title,
            department: document.department,
            classification: document.classification,
            owner: document.owner,
            tags: document.tags
          }
        },
        {
          timeout: this.retrievalTimeout,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      logger.info(`Document added to RAG: ${document._id}`);
      return response.data;
    } catch (error) {
      logger.error('Add document to RAG error:', error);
      throw new Error('Failed to add document to RAG system');
    }
  }

  /**
   * Update document in RAG system
   */
  async updateDocument(document) {
    try {
      const response = await axios.put(
        `${this.aiServiceUrl}/rag/documents/${document._id}`,
        {
          vectorId: document.vectorId,
          encryptedEmbedding: document.encryptedEmbedding,
          embeddingKeyId: document.embeddingKeyId,
          content: document.content,           // ✅ FIX: send content too
          metadata: {
            title: document.title,
            department: document.department,
            classification: document.classification,
            tags: document.tags
          }
        },
        {
          timeout: this.retrievalTimeout,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      logger.info(`Document updated in RAG: ${document._id}`);
      return response.data;
    } catch (error) {
      logger.error('Update document in RAG error:', error);
      throw new Error('Failed to update document in RAG system');
    }
  }

  /**
   * Delete document from RAG system
   */
  async deleteDocument(documentId) {
    try {
      const response = await axios.delete(
        `${this.aiServiceUrl}/rag/documents/${documentId}`,
        {
          timeout: this.retrievalTimeout
        }
      );

      logger.info(`Document deleted from RAG: ${documentId}`);
      return response.data;
    } catch (error) {
      logger.error('Delete document from RAG error:', error);
      throw new Error('Failed to delete document from RAG system');
    }
  }

  /**
   * Retrieve relevant documents for query
   */
  async retrieveRelevantDocuments(query, userId, maxResults = 5) {
    try {
      // Get user's accessible documents
      const accessibleDocuments = await this.getAccessibleDocuments(userId);

      if (accessibleDocuments.length === 0) {
        return {
          documents: [],
          totalRetrieved: 0
        };
      }

      // Call AI service for retrieval
      const response = await axios.post(
        `${this.aiServiceUrl}/rag/retrieve`,
        {
          query,
          documentIds: accessibleDocuments.map(doc => doc._id.toString()),
          maxResults,
          userId: userId.toString()
        },
        {
          timeout: this.retrievalTimeout,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      // Process retrieved documents
      const retrievedDocuments = await this.processRetrievedDocuments(
        response.data.documents,
        userId
      );

      return {
        documents: retrievedDocuments,
        totalRetrieved: retrievedDocuments.length,
        retrievalTime: response.data.retrievalTime
      };
    } catch (error) {
      logger.error('Retrieve relevant documents error:', error);
      throw new Error('Failed to retrieve relevant documents');
    }
  }

  /**
   * Get accessible documents for user
   */
  async getAccessibleDocuments(userId) {
    try {
      // Get user's role and clearance
      const user = await require('../models/User').findById(userId)
        .populate('role')
        .select('department securityClearance role');

      if (!user) {
        return [];
      }

      const clearanceLevels = ['public', 'internal', 'confidential', 'restricted'];
      const userClearanceIndex = clearanceLevels.indexOf(user.securityClearance);

      // Build filter based on user's access
      let filter = {
        status: 'published',
        $or: [
          { owner: userId },                 // Owned documents
          { classification: 'public' }       // Public documents
        ]
      };

      // Add department-based access
      if (user.department) {
        filter.$or.push({
          department: user.department,
          classification: { $in: ['internal', 'public'] }
        });
      }

      // Add clearance-based access
      const allowedClassifications = clearanceLevels.slice(0, userClearanceIndex + 1);
      filter.$or.push({
        classification: { $in: allowedClassifications },
        department: user.department
      });

      // Add ACL-based access
      const aclDocumentIds = await DocumentACL.find({
        user: userId,
        isActive: true,
        $or: [
          { expiresAt: { $gt: new Date() } },
          { expiresAt: null }
        ]
      }).distinct('document');

      if (aclDocumentIds.length > 0) {
        filter.$or.push({ _id: { $in: aclDocumentIds } });
      }

      // Get documents — always include content so RAG has something to search
      const documents = await Document.find(filter)
        .select('_id title content vectorId encryptedEmbedding embeddingKeyId classification department tags')
        .limit(1000);

      return documents;
    } catch (error) {
      logger.error('Get accessible documents error:', error);
      throw error;
    }
  }

  /**
   * Process retrieved documents
   */
  async processRetrievedDocuments(retrievedDocs, userId) {
    try {
      const processedDocs = [];

      if (!retrievedDocs || !Array.isArray(retrievedDocs)) {
        return processedDocs;
      }

      for (const doc of retrievedDocs) {
        // Get full document from database (include content)
        const fullDoc = await Document.findById(doc.documentId)
          .populate('owner', 'username fullName')
          .select('-encryptedContent -encryptedEmbedding');

        if (fullDoc) {
          processedDocs.push({
            _id: fullDoc._id,
            title: fullDoc.title,
            content: fullDoc.content,        // ✅ FIX: include content for generation
            classification: fullDoc.classification,
            department: fullDoc.department,
            tags: fullDoc.tags,
            relevanceScore: doc.score || doc.relevanceScore,
            owner: fullDoc.owner,
            vectorId: fullDoc.vectorId,
            metadata: fullDoc.metadata
          });
        }
      }

      // Sort by relevance score
      processedDocs.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));

      return processedDocs;
    } catch (error) {
      logger.error('Process retrieved documents error:', error);
      throw error;
    }
  }

  /**
   * Generate RAG response
   */
  async generateRAGResponse(query, documents, options = {}) {
    try {
      const response = await axios.post(
        `${this.aiServiceUrl}/rag/generate`,
        {
          query,
          documents: documents.map(doc => ({
            id: doc._id,
            title: doc.title,
            content: doc.content,            // Now populated
            relevanceScore: doc.relevanceScore
          })),
          options: {
            maxTokens: options.maxTokens || 500,
            temperature: options.temperature || 0.7,
            includeCitations: options.includeCitations !== false
          }
        },
        {
          timeout: 60000,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        text: response.data.text,
        citations: response.data.citations || [],
        confidence: response.data.confidence,
        model: response.data.model,
        usage: response.data.usage
      };
    } catch (error) {
      logger.error('Generate RAG response error:', error);
      throw new Error('Failed to generate RAG response');
    }
  }

  /**
   * Check RAG system health
   */
  async checkHealth() {
    try {
      const response = await axios.get(
        `${this.aiServiceUrl}/health`,
        { timeout: 5000 }
      );

      return {
        status: 'healthy',
        latency: response.headers['x-response-time'] || null,
        details: response.data
      };
    } catch (error) {
      logger.error('RAG health check error:', error);
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }

  /**
   * Batch add documents to RAG
   */
  async batchAddDocuments(documents) {
    try {
      const results = [];

      for (const document of documents) {
        try {
          const result = await this.addDocument(document);
          results.push({
            documentId: document._id,
            success: true,
            result
          });
        } catch (error) {
          results.push({
            documentId: document._id,
            success: false,
            error: error.message
          });
        }
      }

      return results;
    } catch (error) {
      logger.error('Batch add documents error:', error);
      throw error;
    }
  }

  /**
   * Get retrieval statistics
   */
  async getRetrievalStats(userId) {
    try {
      return {
        totalRetrievals: 0,
        averageResponseTime: 0,
        averageRelevanceScore: 0,
        topQueries: []
      };
    } catch (error) {
      logger.error('Get retrieval stats error:', error);
      throw error;
    }
  }
}

module.exports = new RAGService();