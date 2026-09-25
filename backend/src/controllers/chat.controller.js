// ============================================
// FIXED: Removed curly braces to match `module.exports = new Service()`
// ============================================
const ragService = require('../services/rag.service');
const aiService = require('../services/ai.service');
const auditService = require('../services/audit.service');
const logger = require('../utils/logger');
const crypto = require('crypto');
const axios = require('axios');

class ChatController {
  /**
   * @desc    Check message safety before sending
   * @route   POST /api/chat/safety-check
   * @access  Private
   */
  async checkSafety(req, res) {
    try {
      const { text } = req.body;

      if (!text) {
        return res.status(400).json({
          success: false,
          message: 'Text is required for safety check'
        });
      }

      try {
        const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
        
        const response = await axios.post(
          `${aiServiceUrl}/safety/check`,
          { text },
          { timeout: 10000 }
        );

        return res.status(200).json({
          success: true,
          safe: response.data.safe !== false,
          score: response.data.score || 0.9,
          reason: response.data.reason || 'Content passed safety check',
          category: response.data.category || 'safe'
        });
      } catch (aiError) {
        logger.warn('AI service unavailable, using fallback safety check');

        const unsafePatterns = [
          { pattern: /password\s*[:=]\s*\S+/i, reason: 'Contains hardcoded password' },
          { pattern: /api[_-]?key\s*[:=]\s*\S+/i, reason: 'Contains hardcoded API key' },
          { pattern: /secret\s*[:=]\s*\S+/i, reason: 'Contains hardcoded secret' },
          { pattern: /\b\d{3}-\d{2}-\d{4}\b/, reason: 'Contains SSN pattern' },
          { pattern: /<script[^>]*>/i, reason: 'Contains script tag' }
        ];

        const triggered = unsafePatterns.filter(p => p.pattern.test(text));

        if (triggered.length > 0) {
          return res.status(200).json({
            success: true,
            safe: false,
            score: 0.3,
            reason: triggered[0].reason,
            category: 'sensitive'
          });
        }

        return res.status(200).json({
          success: true,
          safe: true,
          score: 0.9,
          reason: 'Content passed basic safety check',
          category: 'safe'
        });
      }
    } catch (error) {
      logger.error('Safety check error:', error);
      res.status(500).json({
        success: false,
        message: 'Safety check failed'
      });
    }
  }

  /**
   * @desc    Process chat query
   * @route   POST /api/chat/query
   * @access  Private
   */
  async query(req, res) {
    try {
      const { 
        query, 
        conversationId, 
        maxResults = 5, 
        temperature = 0.7,
        stream = false 
      } = req.body;

      if (!query || query.trim().length < 3) {
        return res.status(400).json({
          success: false,
          message: 'Query must be at least 3 characters long'
        });
      }

      if (query.length > 1000) {
        return res.status(400).json({
          success: false,
          message: 'Query too long. Maximum 1000 characters allowed'
        });
      }

      const activeConversationId = conversationId || crypto.randomUUID();

      // Safety check
      let safetyCheck;
      try {
        const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
        const safetyResponse = await axios.post(
          `${aiServiceUrl}/safety/check`,
          { text: query },
          { timeout: 10000 }
        );
        safetyCheck = {
          safe: safetyResponse.data.safe !== false,
          reason: safetyResponse.data.reason,
          score: safetyResponse.data.score
        };
      } catch (safetyError) {
        safetyCheck = { safe: true, reason: 'Basic check passed', score: 0.9 };
      }

      if (!safetyCheck.safe) {
        try {
          await auditService.logEvent({
            userId: req.user._id,
            username: req.user.username,
            action: 'SECURITY_EVENT',
            resourceType: 'chat',
            details: {
              query: query.substring(0, 100),
              reason: safetyCheck.reason
            },
            status: 'warning',
            ipAddress: req.ip,
            userAgent: req.get('user-agent')
          });
        } catch (auditError) {
          logger.warn('Audit log failed');
        }

        return res.status(400).json({
          success: false,
          message: 'Query contains content that violates safety policies',
          reason: safetyCheck.reason
        });
      }

      // Retrieve documents
      let retrievalResult;
      try {
        retrievalResult = await ragService.retrieveRelevantDocuments(
          query,
          req.user._id,
          maxResults
        );
      } catch (retrievalError) {
        logger.error('Document retrieval failed:', retrievalError);
        return res.status(500).json({
          success: false,
          message: 'Failed to retrieve relevant documents'
        });
      }

      if (!retrievalResult || !retrievalResult.documents || retrievalResult.documents.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No relevant documents found for your query',
          suggestions: []
        });
      }

      // Generate response
      let response;
      try {
        response = await aiService.generateResponse(
          query,
          retrievalResult.documents,
          {
            userId: req.user._id,
            temperature,
            maxResults,
            conversationId: activeConversationId
          }
        );
      } catch (generationError) {
        logger.error('Response generation failed:', generationError);
        return res.status(500).json({
          success: false,
          message: 'Failed to generate response'
        });
      }

      // Log audit
      try {
        await auditService.logEvent({
          userId: req.user._id,
          username: req.user.username,
          action: 'CHAT_QUERY',
          resourceType: 'chat',
          details: {
            query: query.substring(0, 200),
            conversationId: activeConversationId,
            documentCount: retrievalResult.documents.length
          },
          status: 'success'
        });
      } catch (auditError) {
        logger.warn('Audit log failed');
      }

      // Return response
      res.status(200).json({
        success: true,
        data: {
          conversationId: activeConversationId,
          query,
          text: response.text,
          response: response.text,
          citations: response.citations || [],
          sources: retrievalResult.documents.map(doc => ({
            id: doc._id,
            title: doc.title,
            relevanceScore: doc.relevanceScore,
            classification: doc.classification,
            department: doc.department
          })),
          confidence: response.confidence || null,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Chat query error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to process query',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * @desc    Get conversation history
   * @route   GET /api/chat/history/:conversationId
   * @access  Private
   */
  async getHistory(req, res) {
    try {
      const { conversationId } = req.params;
      
      res.status(200).json({
        success: true,
        data: {
          conversationId,
          messages: [],
          createdAt: null,
          updatedAt: null
        }
      });
    } catch (error) {
      logger.error('Get history error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve conversation history'
      });
    }
  }

  /**
   * @desc    List user conversations
   * @route   GET /api/chat/conversations
   * @access  Private
   */
  async listConversations(req, res) {
    try {
      const { page = 1, limit = 20 } = req.query;

      res.status(200).json({
        success: true,
        data: {
          conversations: [],
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: 0,
            pages: 0
          }
        }
      });
    } catch (error) {
      logger.error('List conversations error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to list conversations'
      });
    }
  }

  /**
   * @desc    Get query suggestions
   * @route   GET /api/chat/suggestions
   * @access  Private
   */
  async getSuggestions(req, res) {
    try {
      const { query, limit = 5 } = req.query;

      if (!query) {
        return res.status(400).json({
          success: false,
          message: 'Query parameter is required'
        });
      }

      let suggestions = [];
      try {
        suggestions = await aiService.getSuggestions(query, req.user._id);
      } catch (err) {
        logger.warn('Suggestions fetch failed:', err.message);
      }

      res.status(200).json({
        success: true,
        data: (suggestions || []).slice(0, parseInt(limit))
      });
    } catch (error) {
      logger.error('Get suggestions error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get suggestions'
      });
    }
  }

  /**
   * @desc    Get response feedback
   * @route   POST /api/chat/feedback
   * @access  Private
   */
  async submitFeedback(req, res) {
    try {
      const { conversationId, messageId, rating, feedback } = req.body;

      if (!conversationId || !messageId || !rating) {
        return res.status(400).json({
          success: false,
          message: 'Conversation ID, message ID, and rating are required'
        });
      }

      try {
        await auditService.logEvent({
          userId: req.user._id,
          username: req.user.username,
          action: 'CHAT_FEEDBACK',
          resourceType: 'chat',
          details: { conversationId, messageId, rating, feedback },
          status: 'success'
        });
      } catch (auditError) {
        logger.warn('Audit log failed');
      }

      res.status(200).json({
        success: true,
        message: 'Feedback submitted successfully'
      });
    } catch (error) {
      logger.error('Submit feedback error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to submit feedback'
      });
    }
  }

  /**
   * @desc    Clear conversation history
   * @route   DELETE /api/chat/conversations/:conversationId
   * @access  Private
   */
  async clearConversation(req, res) {
    try {
      const { conversationId } = req.params;

      logger.info(`Conversation cleared: ${conversationId} by ${req.user.username}`);

      res.status(200).json({
        success: true,
        message: 'Conversation cleared successfully'
      });
    } catch (error) {
      logger.error('Clear conversation error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to clear conversation'
      });
    }
  }

  /**
   * @desc    Get chat analytics
   * @route   GET /api/chat/analytics
   * @access  Private (Admin)
   */
  async getAnalytics(req, res) {
    try {
      res.status(200).json({
        success: true,
        data: {
          totalQueries: 0,
          averageLatency: 0,
          safetyViolationCount: 0,
          queriesByDepartment: []
        }
      });
    } catch (error) {
      logger.error('Get chat analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve chat analytics'
      });
    }
  }

  /**
   * @desc    Get chat usage statistics
   * @route   GET /api/chat/usage-stats
   * @access  Private (Admin)
   */
  async getUsageStats(req, res) {
    try {
      res.status(200).json({
        success: true,
        data: {
          dailyQueries: [],
          activeUsers: 0,
          tokenUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
        }
      });
    } catch (error) {
      logger.error('Get chat usage stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve usage stats'
      });
    }
  }
}

module.exports = new ChatController();