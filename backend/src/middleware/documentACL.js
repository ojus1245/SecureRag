const Document = require('../models/Document');
const DocumentACL = require('../models/DocumentACL');
const User = require('../models/User');
const logger = require('../utils/logger');
const AuditLog = require('../models/AuditLog');

/**
 * Document Access Control Middleware
 * Checks if user has access to a specific document
 */
const checkDocumentAccess = async (req, res, next) => {
  try {
    const documentId = req.params.documentId || req.body.documentId;

    if (!documentId) {
      return res.status(400).json({
        success: false,
        message: 'Document ID is required.',
        code: 'ACL_NO_DOCUMENT_ID'
      });
    }

    // Get document
    const document = await Document.findById(documentId)
      .populate('owner', 'username email fullName department');

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found.',
        code: 'ACL_DOCUMENT_NOT_FOUND'
      });
    }

    // Check if document is deleted
    if (document.status === 'deleted') {
      return res.status(410).json({
        success: false,
        message: 'Document has been deleted.',
        code: 'ACL_DOCUMENT_DELETED'
      });
    }

    // Admin bypass
    if (req.user.role?.name === 'admin') {
      req.document = document;
      req.documentAccess = {
        accessType: 'admin',
        permissions: ['read', 'write', 'delete', 'share', 'download'],
        source: 'admin_role'
      };
      return next();
    }

    // Check if user is the owner
    if (document.owner._id.equals(req.user._id)) {
      req.document = document;
      req.documentAccess = {
        accessType: 'owner',
        permissions: ['read', 'write', 'delete', 'share', 'download'],
        source: 'ownership'
      };
      return next();
    }

    // Check explicit ACL entries
    const aclEntry = await DocumentACL.findOne({
      document: document._id,
      user: req.user._id,
      isActive: true,
      $or: [
        { expiresAt: { $gt: new Date() } },
        { expiresAt: null }
      ]
    }).populate('role');

    if (aclEntry && aclEntry.isValid()) {
      req.document = document;
      req.documentAccess = {
        accessType: 'explicit',
        permissions: aclEntry.permissions,
        source: 'acl',
        aclEntry
      };
      return next();
    }

    // Check department-based access
    if (document.department === req.user.department) {
      const clearanceLevels = ['public', 'internal', 'confidential', 'restricted'];
      const userClearanceIndex = clearanceLevels.indexOf(req.user.securityClearance);
      const docClassificationIndex = clearanceLevels.indexOf(document.classification);

      if (userClearanceIndex >= docClassificationIndex) {
        req.document = document;
        req.documentAccess = {
          accessType: 'department',
          permissions: ['read'],
          source: 'department_clearance'
        };
        return next();
      }
    }

    // Check classification-based access (public documents)
    if (document.classification === 'public') {
      req.document = document;
      req.documentAccess = {
        accessType: 'public',
        permissions: ['read'],
        source: 'public_classification'
      };
      return next();
    }

    // Log denied access
    await AuditLog.createLog({
      userId: req.user._id,
      username: req.user.username,
      action: 'SECURITY_EVENT',
      resourceType: 'document',
      resourceId: document._id,
      details: {
        event: 'DOCUMENT_ACCESS_DENIED',
        documentTitle: document.title,
        classification: document.classification,
        reason: 'No access permissions',
        ipAddress: req.ip
      },
      status: 'warning',
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    return res.status(403).json({
      success: false,
      message: 'You do not have access to this document.',
      code: 'ACL_ACCESS_DENIED',
      documentClassification: document.classification,
      requiredClearance: document.classification,
      userClearance: req.user.securityClearance
    });
  } catch (error) {
    logger.error('Document ACL check error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to check document access.',
      code: 'ACL_SERVER_ERROR'
    });
  }
};

/**
 * Check Document Permission Middleware
 * Checks if user has specific permission on document
 */
const checkDocumentPermission = (requiredPermission) => {
  return async (req, res, next) => {
    try {
      // Check if document access was already checked
      if (!req.document || !req.documentAccess) {
        return res.status(500).json({
          success: false,
          message: 'Document access not checked.',
          code: 'ACL_NO_ACCESS_CHECK'
        });
      }

      // Check if user has required permission
      const userPermissions = req.documentAccess.permissions || [];

      if (userPermissions.includes('*') || userPermissions.includes(requiredPermission)) {
        return next();
      }

      // Log permission denied
      await AuditLog.createLog({
        userId: req.user._id,
        username: req.user.username,
        action: 'SECURITY_EVENT',
        resourceType: 'document',
        resourceId: req.document._id,
        details: {
          event: 'DOCUMENT_PERMISSION_DENIED',
          documentTitle: req.document.title,
          requiredPermission,
          userPermissions,
          ipAddress: req.ip
        },
        status: 'warning',
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });

      return res.status(403).json({
        success: false,
        message: `You do not have ${requiredPermission} permission for this document.`,
        code: 'ACL_PERMISSION_DENIED',
        requiredPermission,
        userPermissions
      });
    } catch (error) {
      logger.error('Document permission check error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to check document permission.',
        code: 'ACL_PERMISSION_ERROR'
      });
    }
  };
};

/**
 * Check Document Classification Middleware
 * Checks if user's clearance level is sufficient for document classification
 */
const checkDocumentClassification = async (req, res, next) => {
  try {
    const document = req.document;

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found.',
        code: 'ACL_DOCUMENT_NOT_FOUND'
      });
    }

    const clearanceLevels = ['public', 'internal', 'confidential', 'restricted'];
    const userClearanceIndex = clearanceLevels.indexOf(req.user.securityClearance);
    const docClassificationIndex = clearanceLevels.indexOf(document.classification);

    if (userClearanceIndex >= docClassificationIndex) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'Insufficient clearance for this document classification.',
      code: 'ACL_INSUFFICIENT_CLEARANCE',
      documentClassification: document.classification,
      userClearance: req.user.securityClearance
    });
  } catch (error) {
    logger.error('Classification check error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to check document classification.',
      code: 'ACL_CLASSIFICATION_ERROR'
    });
  }
};

/**
 * Check Document Department Middleware
 * Checks if user belongs to the same department
 */
const checkDocumentDepartment = async (req, res, next) => {
  try {
    const document = req.document;

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found.',
        code: 'ACL_DOCUMENT_NOT_FOUND'
      });
    }

    // Admin bypass
    if (req.user.role?.name === 'admin') {
      return next();
    }

    // Check department
    if (document.department === req.user.department) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'Document belongs to a different department.',
      code: 'ACL_WRONG_DEPARTMENT',
      documentDepartment: document.department,
      userDepartment: req.user.department
    });
  } catch (error) {
    logger.error('Department check error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to check document department.',
      code: 'ACL_DEPARTMENT_ERROR'
    });
  }
};

/**
 * Check Document Status Middleware
 * Checks if document is in a valid status
 */
const checkDocumentStatus = (allowedStatuses = ['published']) => {
  return async (req, res, next) => {
    try {
      const document = req.document;

      if (!document) {
        return res.status(404).json({
          success: false,
          message: 'Document not found.',
          code: 'ACL_DOCUMENT_NOT_FOUND'
        });
      }

      if (!allowedStatuses.includes(document.status)) {
        return res.status(403).json({
          success: false,
          message: `Document is not in an accessible status (${document.status}).`,
          code: 'ACL_INVALID_STATUS',
          documentStatus: document.status,
          allowedStatuses
        });
      }

      next();
    } catch (error) {
      logger.error('Status check error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to check document status.',
        code: 'ACL_STATUS_ERROR'
      });
    }
  };
};

/**
 * Rate Limit Document Access Middleware
 * Prevents excessive access to sensitive documents
 */
const rateLimitDocumentAccess = async (req, res, next) => {
  try {
    const document = req.document;
    const userId = req.user._id;

    // Only apply to sensitive documents
    if (['confidential', 'restricted'].includes(document.classification)) {
      // Check access count in last hour
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      
      const accessCount = await AuditLog.countDocuments({
        userId,
        resourceType: 'document',
        resourceId: document._id,
        action: 'DOCUMENT_READ',
        timestamp: { $gte: oneHourAgo }
      });

      // Maximum 50 accesses per hour for sensitive documents
      if (accessCount >= 50) {
        return res.status(429).json({
          success: false,
          message: 'Too many requests for this document. Please try again later.',
          code: 'ACL_RATE_LIMITED',
          documentClassification: document.classification,
          accessCount
        });
      }
    }

    next();
  } catch (error) {
    logger.error('Rate limit check error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to check rate limit.',
      code: 'ACL_RATE_LIMIT_ERROR'
    });
  }
};

module.exports = {
  checkDocumentAccess,
  checkDocumentPermission,
  checkDocumentClassification,
  checkDocumentDepartment,
  checkDocumentStatus,
  rateLimitDocumentAccess
};