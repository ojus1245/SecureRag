const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chat.controller');
const { authenticate } = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');
const { validate } = require('../middleware/validate');
const { body } = require('express-validator');

// ============================================
// Validation Rules
// ============================================

const safetyCheckValidation = [
  body('text')
    .trim()
    .notEmpty()
    .withMessage('Text is required for safety check')
];

const chatQueryValidation = [
  body('query')
    .trim()
    .isLength({ min: 3, max: 1000 })
    .withMessage('Query must be between 3 and 1000 characters')
];

const feedbackValidation = [
  body('conversationId')
    .notEmpty()
    .withMessage('Conversation ID is required'),
  body('messageId')
    .notEmpty()
    .withMessage('Message ID is required'),
  body('rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5')
];

// ============================================
// All routes require authentication
// ============================================

router.use(authenticate);

// ============================================
// Safety check
// ============================================

router.post(
  '/safety-check',
  authorize('chat:query'),
  validate(safetyCheckValidation),
  chatController.checkSafety
);

// ============================================
// Chat query
// ============================================

router.post(
  '/query',
  authorize('chat:query'),
  validate(chatQueryValidation),
  chatController.query
);

// ============================================
// Conversations
// ============================================

router.get(
  '/conversations',
  authorize('chat:query'),
  chatController.listConversations
);

router.get(
  '/history/:conversationId',
  authorize('chat:query'),
  chatController.getHistory
);

router.delete(
  '/conversations/:conversationId',
  authorize('chat:query'),
  chatController.clearConversation
);

// ============================================
// Suggestions
// ============================================

router.get(
  '/suggestions',
  authorize('chat:query'),
  chatController.getSuggestions
);

// ============================================
// Feedback
// ============================================

router.post(
  '/feedback',
  authorize('chat:query'),
  validate(feedbackValidation),
  chatController.submitFeedback
);

// ============================================
// Admin routes
// ============================================

router.get(
  '/analytics',
  authorize('audit:view', 'system:configure'),
  chatController.getAnalytics
);

router.get(
  '/usage-stats',
  authorize('audit:view', 'system:configure'),
  chatController.getUsageStats
);

// ============================================
// CRITICAL: Export the router
// ============================================

module.exports = router;