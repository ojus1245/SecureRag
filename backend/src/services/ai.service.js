const axios = require('axios');
const config = require('../config/config');
const logger = require('../utils/logger');
const { logAuditEvent, logSecurityEvent } = require('../middleware/auditLogger');

class AIService {
  constructor() {
    this.aiServiceUrl = config.aiService.url;
    this.defaultTimeout = 30000;
    this.maxRetries = 3;
  }

  /**
   * Check query safety
   */
  async checkSafety(query, userId) {
    try {
      const response = await axios.post(
        `${this.aiServiceUrl}/safety/check`,
        {
          text: query,
          userId
        },
        {
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        safe: response.data.safe,
        score: response.data.score,
        reason: response.data.reason,
        categories: response.data.categories || []
      };
    } catch (error) {
      logger.error('Safety check error:', error);
      
      // Fail closed - if safety check fails, don't allow query
      return {
        safe: false,
        score: 0,
        reason: 'Safety check service unavailable',
        categories: ['service_unavailable']
      };
    }
  }

  /**
   * Generate response using RAG
   */
  async generateResponse(query, documents, options = {}) {
    try {
      const response = await axios.post(
        `${this.aiServiceUrl}/generate`,
        {
          query,
          documents: documents.map(doc => ({
            id: doc._id,
            title: doc.title,
            content: doc.content,
            relevanceScore: doc.relevanceScore,
            classification: doc.classification
          })),
          options: {
            maxTokens: options.maxTokens || 500,
            temperature: options.temperature || 0.7,
            model: options.model || 'default',
            includeCitations: options.includeCitations !== false,
            userId: options.userId
          }
        },
        {
          timeout: 60000,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      // Process response
      return {
        text: response.data.text,
        citations: response.data.citations || [],
        confidence: response.data.confidence || null,
        model: response.data.model || 'unknown',
        usage: response.data.usage || {},
        responseTime: response.headers['x-response-time'] || null
      };
    } catch (error) {
      logger.error('Generate response error:', error);
      throw new Error('Failed to generate AI response');
    }
  }

  /**
   * Generate query suggestions
   */
  async getSuggestions(query, userId) {
    try {
      const response = await axios.post(
        `${this.aiServiceUrl}/suggestions`,
        {
          query,
          userId,
          maxSuggestions: 5
        },
        {
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data.suggestions || [];
    } catch (error) {
      logger.error('Get suggestions error:', error);
      return [];
    }
  }

  /**
   * Generate embedding for text
   */
  async generateEmbedding(text) {
    try {
      const response = await axios.post(
        `${this.aiServiceUrl}/embeddings`,
        {
          text,
          model: 'sentence-transformers/all-MiniLM-L6-v2'
        },
        {
          timeout: 30000,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data.embedding;
    } catch (error) {
      logger.error('Generate embedding error:', error);
      throw new Error('Failed to generate embedding');
    }
  }

  /**
   * Classify document content
   */
  async classifyDocument(content) {
    try {
      const response = await axios.post(
        `${this.aiServiceUrl}/classify`,
        {
          text: content
        },
        {
          timeout: 15000,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        classification: response.data.classification,
        confidence: response.data.confidence,
        categories: response.data.categories || [],
        sensitiveInfo: response.data.sensitiveInfo || []
      };
    } catch (error) {
      logger.error('Classify document error:', error);
      throw new Error('Failed to classify document');
    }
  }

  /**
   * Extract entities from text
   */
  async extractEntities(text) {
    try {
      const response = await axios.post(
        `${this.aiServiceUrl}/entities`,
        {
          text
        },
        {
          timeout: 15000,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data.entities || [];
    } catch (error) {
      logger.error('Extract entities error:', error);
      return [];
    }
  }

  /**
   * Summarize document
   */
  async summarizeDocument(content, maxLength = 200) {
    try {
      const response = await axios.post(
        `${this.aiServiceUrl}/summarize`,
        {
          text: content,
          maxLength
        },
        {
          timeout: 30000,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data.summary;
    } catch (error) {
      logger.error('Summarize document error:', error);
      throw new Error('Failed to summarize document');
    }
  }

  /**
   * Check AI service health
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
        model: response.data.model || 'unknown',
        version: response.data.version || 'unknown'
      };
    } catch (error) {
      logger.error('AI service health check error:', error);
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }

  /**
   * Retry wrapper for AI service calls
   */
  async retryRequest(requestFn, maxRetries = this.maxRetries) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await requestFn();
      } catch (error) {
        lastError = error;
        logger.warn(`AI service request failed (attempt ${attempt}/${maxRetries}):`, error.message);
        
        if (attempt < maxRetries) {
          // Exponential backoff
          const delay = Math.pow(2, attempt - 1) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError;
  }

  /**
   * Log AI service usage
   */
  async logUsage(userId, action, details) {
    try {
      await logAuditEvent({
        userId,
        action: `AI_${action.toUpperCase()}`,
        resourceType: 'system',
        details: {
          ...details,
          timestamp: new Date().toISOString()
        },
        status: 'success'
      });
    } catch (error) {
      logger.error('Log AI usage error:', error);
    }
  }

  /**
   * Get model information
   */
  async getModelInfo() {
    try {
      const response = await axios.get(
        `${this.aiServiceUrl}/models`,
        { timeout: 10000 }
      );

      return response.data.models || [];
    } catch (error) {
      logger.error('Get model info error:', error);
      return [];
    }
  }
}

module.exports = new AIService();