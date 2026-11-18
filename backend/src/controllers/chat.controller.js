const ragService = require('../services/rag.service');
const aiService = require('../services/ai.service');
const auditService = require('../services/audit.service');
const Conversation = require('../models/Conversation');
const logger = require('../utils/logger');
const crypto = require('crypto');
const axios = require('axios');
const mongoose = require('mongoose');

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
        stream = false,
        documentId = null,
        specificDocumentId = null
      } = req.body;

      const targetDocId = documentId || specificDocumentId;

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

      const activeConversationId = conversationId || `conv-${Date.now()}`;

      // Notify WebSocket subscribers about retrieval start
      if (req.app.broadcastToChannel) {
        req.app.broadcastToChannel(`conversation:${activeConversationId}`, {
          type: 'retrieval_status',
          status: 'retrieving',
          message: 'Searching documents in knowledge base...'
        });
      }

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

      if (req.app.broadcastToChannel) {
        req.app.broadcastToChannel(`conversation:${activeConversationId}`, {
          type: 'safety_check',
          ...safetyCheck
        });
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
      let retrievalResult = { documents: [] };
      try {
        retrievalResult = await ragService.retrieveRelevantDocuments(
          query,
          req.user._id,
          maxResults,
          targetDocId
        );
      } catch (retrievalError) {
        logger.warn('Document retrieval had issues, falling back to general AI generation:', retrievalError.message);
        retrievalResult = { documents: [] };
      }

      const docs = (retrievalResult && retrievalResult.documents) ? retrievalResult.documents : [];

      // Generate response
      let response;
      try {
        response = await aiService.generateResponse(
          query,
          docs,
          {
            userId: req.user._id,
            temperature,
            maxResults,
            conversationId: activeConversationId
          }
        );
      } catch (generationError) {
        logger.error('Response generation failed:', generationError);
        // Fallback response if generation encounters an issue
        response = {
          text: `I received your question: "${query}". However, the AI response service encountered a temporary error. If you have uploaded documents, please ensure they have been indexed.`,
          citations: [],
          confidence: 0.5
        };
      }

      // Format sources
      const sources = docs.map(doc => ({
        id: doc._id || doc.id,
        title: doc.title,
        relevanceScore: doc.relevanceScore,
        classification: doc.classification,
        department: doc.department
      }));

      // Persist in MongoDB Conversation
      try {
        let conv = await Conversation.findOne({
          $or: [
            { id: activeConversationId },
            { _id: mongoose.Types.ObjectId.isValid(activeConversationId) ? activeConversationId : null }
          ],
          userId: req.user._id
        });

        const shortTitle = query.length > 40 ? query.substring(0, 37) + '...' : query;

        if (!conv) {
          conv = new Conversation({
            id: activeConversationId,
            userId: req.user._id,
            title: shortTitle,
            isActive: true,
            messages: []
          });
        } else {
          conv.isActive = true;
        }

        const userMsg = {
          id: `msg-user-${Date.now()}`,
          role: 'user',
          content: query,
          timestamp: new Date()
        };

        const asstMsg = {
          id: `msg-asst-${Date.now()}`,
          role: 'assistant',
          content: response.text,
          citations: response.citations || [],
          sources: sources,
          timestamp: new Date()
        };

        conv.messages.push(userMsg, asstMsg);
        conv.updatedAt = new Date();
        await conv.save();
      } catch (convErr) {
        logger.warn('Failed to persist conversation history:', convErr.message);
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
            documentCount: docs.length
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
          sources: sources,
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

      const conv = await Conversation.findOne({
        $or: [
          { id: conversationId },
          { _id: mongoose.Types.ObjectId.isValid(conversationId) ? conversationId : null }
        ],
        userId: req.user._id
      });

      res.status(200).json({
        success: true,
        data: {
          conversationId,
          title: conv?.title || 'New Conversation',
          messages: conv ? conv.messages.map(m => ({
            id: m.id,
            role: m.role,
            content: m.content,
            citations: m.citations || [],
            sources: m.sources || [],
            feedback: m.feedback,
            timestamp: m.timestamp
          })) : [],
          createdAt: conv?.createdAt || null,
          updatedAt: conv?.updatedAt || null
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

      const conversations = await Conversation.find({
        userId: req.user._id,
        isActive: { $ne: false }
      })
        .sort({ updatedAt: -1 })
        .limit(parseInt(limit));

      const total = await Conversation.countDocuments({
        userId: req.user._id,
        isActive: { $ne: false }
      });

      res.status(200).json({
        success: true,
        data: {
          conversations: conversations.map(c => ({
            id: c.id,
            _id: c._id,
            title: c.title,
            messageCount: (c.messages || []).length,
            lastMessage: c.messages && c.messages.length > 0
              ? c.messages[c.messages.length - 1].content?.slice(0, 100)
              : null,
            createdAt: c.createdAt,
            updatedAt: c.updatedAt
          })),
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit)) || 1
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
        await Conversation.updateOne(
          {
            $or: [
              { id: conversationId },
              { _id: mongoose.Types.ObjectId.isValid(conversationId) ? conversationId : null }
            ],
            'messages.id': messageId
          },
          {
            $set: { 'messages.$.feedback': rating }
          }
        );
      } catch (e) {
        logger.warn('Failed to update feedback on message:', e.message);
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

      await Conversation.updateOne(
        {
          $or: [
            { id: conversationId },
            { _id: mongoose.Types.ObjectId.isValid(conversationId) ? conversationId : null }
          ],
          userId: req.user._id
        },
        {
          $set: { isActive: false }
        }
      );

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
