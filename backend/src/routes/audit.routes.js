const express = require('express');
const router = express.Router();
const auditController = require('../controllers/audit.controller');
const { authenticate } = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');
const { validate } = require('../middleware/validate');
const { param, query, body } = require('express-validator');

// Validation rules
const getAuditLogsValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 200 })
    .withMessage('Limit must be between 1 and 200'),
  
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid start date format'),
  
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid end date format'),
  
  query('action')
    .optional()
    .isIn([
      'LOGIN', 'LOGOUT', 'DOCUMENT_CREATE', 'DOCUMENT_READ', 
      'DOCUMENT_UPDATE', 'DOCUMENT_DELETE', 'DOCUMENT_SHARE', 
      'DOCUMENT_DOWNLOAD', 'CHAT_QUERY', 'CHAT_RESPONSE', 
      'USER_CREATE', 'USER_UPDATE', 'USER_DELETE', 'ROLE_UPDATE', 
      'ACL_UPDATE', 'SYSTEM_CONFIG', 'SECURITY_EVENT', 'ERROR'
    ])
    .withMessage('Invalid action type'),
  
  query('resourceType')
    .optional()
    .isIn(['user', 'document', 'chat', 'role', 'system', 'audit'])
    .withMessage('Invalid resource type'),
  
  query('status')
    .optional()
    .isIn(['success', 'failure', 'warning'])
    .withMessage('Invalid status'),
  
  query('sortBy')
    .optional()
    .isIn(['timestamp', 'action', 'status', 'username'])
    .withMessage('Invalid sort field'),
  
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Invalid sort order')
];

// All routes require authentication
router.use(authenticate);

// Get audit logs with filters
router.get(
  '/',
  authorize('audit:view'),
  validate(getAuditLogsValidation),
  auditController.getAuditLogs
);

// Get audit statistics
router.get(
  '/stats',
  authorize('audit:view'),
  validate([
    query('startDate')
      .optional()
      .isISO8601()
      .withMessage('Invalid start date'),
    query('endDate')
      .optional()
      .isISO8601()
      .withMessage('Invalid end date'),
    query('userId')
      .optional()
      .isMongoId()
      .withMessage('Invalid user ID'),
    query('resourceType')
      .optional()
      .isIn(['user', 'document', 'chat', 'role', 'system', 'audit'])
      .withMessage('Invalid resource type')
  ]),
  auditController.getAuditStats
);

// Get security events
router.get(
  '/security-events',
  authorize('audit:view', 'system:configure'),
  validate([
    query('severity')
      .optional()
      .isIn(['low', 'medium', 'high', 'critical'])
      .withMessage('Invalid severity level'),
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100')
  ]),
  auditController.getSecurityEvents
);

// Get user audit trail
router.get(
  '/user/:userId',
  authorize('audit:view'),
  validate([
    param('userId')
      .isMongoId()
      .withMessage('Invalid user ID'),
    query('startDate')
      .optional()
      .isISO8601()
      .withMessage('Invalid start date'),
    query('endDate')
      .optional()
      .isISO8601()
      .withMessage('Invalid end date'),
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100')
  ]),
  auditController.getUserAuditTrail
);

// Export audit logs
router.get(
  '/export',
  authorize('audit:view', 'system:configure'),
  validate([
    query('format')
      .optional()
      .isIn(['json', 'csv'])
      .withMessage('Format must be json or csv'),
    query('startDate')
      .optional()
      .isISO8601()
      .withMessage('Invalid start date'),
    query('endDate')
      .optional()
      .isISO8601()
      .withMessage('Invalid end date')
  ]),
  auditController.exportAuditLogs
);

// Cleanup old audit logs (Admin only)
router.delete(
  '/cleanup',
  authorize('system:configure'),
  validate([
    body('beforeDate')
      .optional()
      .isISO8601()
      .withMessage('Invalid date format'),
    body('retentionDays')
      .optional()
      .isInt({ min: 30, max: 3650 })
      .withMessage('Retention days must be between 30 and 3650')
  ]),
  auditController.cleanupAuditLogs
);

// Get specific audit log
router.get(
  '/:logId',
  authorize('audit:view'),
  validate([
    param('logId')
      .isMongoId()
      .withMessage('Invalid log ID')
  ]),
  auditController.getAuditLogById
);

// Advanced analytics (Admin only)
router.get(
  '/analytics/trends',
  authorize('audit:view', 'system:configure'),
  validate([
    query('startDate')
      .optional()
      .isISO8601()
      .withMessage('Invalid start date'),
    query('endDate')
      .optional()
      .isISO8601()
      .withMessage('Invalid end date'),
    query('interval')
      .optional()
      .isIn(['hourly', 'daily', 'weekly', 'monthly'])
      .withMessage('Invalid interval')
  ]),
  auditController.getTrendAnalytics
);

router.get(
  '/analytics/users',
  authorize('audit:view', 'system:configure'),
  validate([
    query('startDate')
      .optional()
      .isISO8601()
      .withMessage('Invalid start date'),
    query('endDate')
      .optional()
      .isISO8601()
      .withMessage('Invalid end date'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100')
  ]),
  auditController.getUserAnalytics
);

module.exports = router;