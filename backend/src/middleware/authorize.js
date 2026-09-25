const logger = require('../utils/logger');
const AuditLog = require('../models/AuditLog');

/**
 * Authorization Middleware
 * Checks if user has required permissions
 */
const authorize = (...requiredPermissions) => {
  return async (req, res, next) => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required.',
          code: 'AUTHZ_NO_USER'
        });
      }

      // Get user permissions
      const userPermissions = req.user.role?.permissions || [];
      const userRole = req.user.role?.name || 'unknown';
      const accessLevel = req.user.role?.accessLevel || 1;

      // Admin bypass (admin has all permissions)
      if (userRole === 'admin') {
        req.authorization = {
          userId: req.user._id,
          role: userRole,
          permissions: ['*'],
          accessLevel: 5,
          authorized: true,
          reason: 'Admin role'
        };
        return next();
      }

      // Check if any required permission is satisfied
      const hasPermission = requiredPermissions.some(permission => {
        // Wildcard permission
        if (userPermissions.includes('*')) {
          return true;
        }

        // Direct permission match
        if (userPermissions.includes(permission)) {
          return true;
        }

        // Check for wildcard permissions (e.g., "document:*")
        const [resource, action] = permission.split(':');
        const wildcardPermission = `${resource}:*`;
        
        return userPermissions.includes(wildcardPermission);
      });

      if (!hasPermission) {
        // Log unauthorized access attempt
        await AuditLog.createLog({
          userId: req.user._id,
          username: req.user.username,
          action: 'SECURITY_EVENT',
          resourceType: 'system',
          details: {
            event: 'UNAUTHORIZED_ACCESS_ATTEMPT',
            requiredPermissions,
            userPermissions,
            userRole,
            method: req.method,
            path: req.path,
            ipAddress: req.ip
          },
          status: 'warning',
          ipAddress: req.ip,
          userAgent: req.get('user-agent')
        });

        logger.warn(`Unauthorized access attempt by ${req.user.username} (${userRole}) to ${req.method} ${req.path}`);

        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to perform this action.',
          code: 'AUTHZ_INSUFFICIENT_PERMISSIONS',
          requiredPermissions,
          userRole,
          userPermissions
        });
      }

      // Attach authorization context
      req.authorization = {
        userId: req.user._id,
        role: userRole,
        permissions: userPermissions,
        accessLevel,
        authorized: true,
        reason: `Has required permission: ${requiredPermissions.join(', ')}`
      };

      next();
    } catch (error) {
      logger.error('Authorization middleware error:', error);
      return res.status(500).json({
        success: false,
        message: 'Authorization failed due to server error.',
        code: 'AUTHZ_SERVER_ERROR'
      });
    }
  };
};

/**
 * Role-based Authorization
 * Checks if user has specific role
 */
const authorizeRole = (...allowedRoles) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required.',
          code: 'AUTHZ_NO_USER'
        });
      }

      const userRole = req.user.role?.name;

      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient role for this action.',
          code: 'AUTHZ_INSUFFICIENT_ROLE',
          requiredRoles: allowedRoles,
          userRole
        });
      }

      next();
    } catch (error) {
      logger.error('Role authorization error:', error);
      return res.status(500).json({
        success: false,
        message: 'Role authorization failed.',
        code: 'AUTHZ_ROLE_ERROR'
      });
    }
  };
};

/**
 * Clearance-based Authorization
 * Checks if user has required security clearance level
 */
const authorizeClearance = (requiredClearance) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required.',
          code: 'AUTHZ_NO_USER'
        });
      }

      const clearanceLevels = ['public', 'internal', 'confidential', 'restricted'];
      const userClearanceIndex = clearanceLevels.indexOf(req.user.securityClearance);
      const requiredClearanceIndex = clearanceLevels.indexOf(requiredClearance);

      if (userClearanceIndex < requiredClearanceIndex) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient security clearance.',
          code: 'AUTHZ_INSUFFICIENT_CLEARANCE',
          requiredClearance,
          userClearance: req.user.securityClearance
        });
      }

      next();
    } catch (error) {
      logger.error('Clearance authorization error:', error);
      return res.status(500).json({
        success: false,
        message: 'Clearance authorization failed.',
        code: 'AUTHZ_CLEARANCE_ERROR'
      });
    }
  };
};

/**
 * Department-based Authorization
 * Checks if user belongs to specific department
 */
const authorizeDepartment = (...allowedDepartments) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required.',
          code: 'AUTHZ_NO_USER'
        });
      }

      if (!allowedDepartments.includes(req.user.department)) {
        return res.status(403).json({
          success: false,
          message: 'Access restricted to specific departments.',
          code: 'AUTHZ_WRONG_DEPARTMENT',
          allowedDepartments,
          userDepartment: req.user.department
        });
      }

      next();
    } catch (error) {
      logger.error('Department authorization error:', error);
      return res.status(500).json({
        success: false,
        message: 'Department authorization failed.',
        code: 'AUTHZ_DEPARTMENT_ERROR'
      });
    }
  };
};

/**
 * Ownership Authorization
 * Checks if user owns the resource
 */
const authorizeOwner = (resourceField = 'owner') => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required.',
          code: 'AUTHZ_NO_USER'
        });
      }

      const resource = req[resourceField] || req.document;
      
      if (!resource) {
        return res.status(404).json({
          success: false,
          message: 'Resource not found.',
          code: 'AUTHZ_RESOURCE_NOT_FOUND'
        });
      }

      // Check if user is the owner
      const ownerId = resource.owner?._id || resource.owner;
      
      if (!ownerId || !ownerId.equals(req.user._id)) {
        // Check if admin
        if (req.user.role?.name === 'admin') {
          return next();
        }

        return res.status(403).json({
          success: false,
          message: 'Only the owner can perform this action.',
          code: 'AUTHZ_NOT_OWNER'
        });
      }

      next();
    } catch (error) {
      logger.error('Owner authorization error:', error);
      return res.status(500).json({
        success: false,
        message: 'Owner authorization failed.',
        code: 'AUTHZ_OWNER_ERROR'
      });
    }
  };
};

/**
 * Composite Authorization
 * Combines multiple authorization checks
 */
const authorizeAll = (...middlewares) => {
  return async (req, res, next) => {
    try {
      for (const middleware of middlewares) {
        await new Promise((resolve, reject) => {
          middleware(req, res, (err) => {
            if (err) reject(err);
            else resolve();
          });
        });
      }
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Conditional Authorization
 * Applies authorization only if condition is met
 */
const authorizeIf = (condition, ...requiredPermissions) => {
  return (req, res, next) => {
    if (condition(req)) {
      return authorize(...requiredPermissions)(req, res, next);
    }
    next();
  };
};

module.exports = {
  authorize,
  authorizeRole,
  authorizeClearance,
  authorizeDepartment,
  authorizeOwner,
  authorizeAll,
  authorizeIf
};