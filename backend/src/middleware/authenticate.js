const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Role = require('../models/Role');
const config = require('../config/config');
const logger = require('../utils/logger');
const AuditLog = require('../models/AuditLog');

/**
 * Authentication Middleware
 * Verifies JWT token and attaches user to request
 */
const authenticate = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. No token provided.',
        code: 'AUTH_NO_TOKEN'
      });
    }

    const token = authHeader.split(' ')[1].trim();

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Empty token.',
        code: 'AUTH_EMPTY_TOKEN'
      });
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, config.jwt.secret, {
        algorithms: ['HS256']
      });
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token has expired. Please login again.',
          code: 'AUTH_TOKEN_EXPIRED',
          expiredAt: error.expiredAt
        });
      }
      
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: 'Invalid token.',
          code: 'AUTH_INVALID_TOKEN'
        });
      }
      
      logger.error('Token verification error:', error);
      return res.status(401).json({
        success: false,
        message: 'Token verification failed.',
        code: 'AUTH_TOKEN_ERROR'
      });
    }

    // Check token type
    if (decoded.type && decoded.type !== 'access') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token type.',
        code: 'AUTH_INVALID_TOKEN_TYPE'
      });
    }

    // Get user from database with role
    const user = await User.findById(decoded.userId)
      .populate({
        path: 'role',
        select: 'name description permissions accessLevel'
      })
      .select('-password -__v');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found or account has been deleted.',
        code: 'AUTH_USER_NOT_FOUND'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      // Log security event
      await AuditLog.createLog({
        userId: user._id,
        username: user.username,
        action: 'SECURITY_EVENT',
        resourceType: 'system',
        details: {
          event: 'INACTIVE_ACCOUNT_ACCESS_ATTEMPT',
          ipAddress: req.ip
        },
        status: 'warning',
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });

      return res.status(403).json({
        success: false,
        message: 'Account is deactivated. Please contact administrator.',
        code: 'AUTH_ACCOUNT_INACTIVE'
      });
    }

    // Check if role exists and is active
    if (!user.role) {
      return res.status(403).json({
        success: false,
        message: 'User has no assigned role.',
        code: 'AUTH_NO_ROLE'
      });
    }

    // Check token version (for token revocation)
    if (decoded.tokenVersion !== undefined && user.tokenVersion && decoded.tokenVersion !== user.tokenVersion) {
      return res.status(401).json({
        success: false,
        message: 'Token has been revoked. Please login again.',
        code: 'AUTH_TOKEN_REVOKED'
      });
    }

    // Check if password was changed after token was issued
    if (user.passwordChangedAt) {
      const passwordChangedAt = Math.floor(new Date(user.passwordChangedAt).getTime() / 1000);
      if (decoded.iat < passwordChangedAt - 1) {
        return res.status(401).json({
          success: false,
          message: 'Password has been changed. Please login again.',
          code: 'AUTH_PASSWORD_CHANGED'
        });
      }
    }

    // Attach user and token info to request
    req.user = user;
    req.userId = user._id;
    req.token = token;
    req.tokenDecoded = decoded;
    req.role = user.role.name;
    req.permissions = user.role.permissions || [];
    req.accessLevel = user.role.accessLevel || 1;

    // Add security context
    req.securityContext = {
      userId: user._id,
      username: user.username,
      role: user.role.name,
      securityClearance: user.securityClearance,
      department: user.department,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      authenticatedAt: new Date().toISOString()
    };

    // Log authentication event (only for sensitive operations)
    if (req.method !== 'GET') {
      await AuditLog.createLog({
        userId: user._id,
        username: user.username,
        action: 'AUTHENTICATE',
        resourceType: 'system',
        details: {
          method: req.method,
          path: req.path,
          ipAddress: req.ip
        },
        status: 'success',
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });
    }

    logger.debug(`Authenticated user: ${user.username} (${user.role.name})`);
    next();
  } catch (error) {
    logger.error('Authentication middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication failed due to server error.',
      code: 'AUTH_SERVER_ERROR'
    });
  }
};

/**
 * Optional Authentication Middleware
 * Attaches user to request if token is valid, but doesn't require it
 */
const optionalAuthenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = null;
      return next();
    }

    const token = authHeader.split(' ')[1].trim();

    try {
      const decoded = jwt.verify(token, config.jwt.secret);
      const user = await User.findById(decoded.userId)
        .populate('role', 'name permissions accessLevel')
        .select('-password');

      if (user && user.isActive) {
        req.user = user;
        req.userId = user._id;
        req.role = user.role.name;
        req.permissions = user.role.permissions || [];
      } else {
        req.user = null;
      }
    } catch (error) {
      req.user = null;
    }

    next();
  } catch (error) {
    logger.error('Optional authentication error:', error);
    req.user = null;
    next();
  }
};

/**
 * API Key Authentication Middleware
 * For service-to-service authentication
 */
const authenticateApiKey = async (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
      return res.status(401).json({
        success: false,
        message: 'API key required.',
        code: 'AUTH_NO_API_KEY'
      });
    }

    // In production, validate against stored API keys
    // This is a simplified example
    const validApiKeys = config.apiKeys || [];
    const apiKeyEntry = validApiKeys.find(k => k.key === apiKey && k.isActive);

    if (!apiKeyEntry) {
      return res.status(401).json({
        success: false,
        message: 'Invalid API key.',
        code: 'AUTH_INVALID_API_KEY'
      });
    }

    // Check expiry
    if (apiKeyEntry.expiresAt && new Date(apiKeyEntry.expiresAt) < new Date()) {
      return res.status(401).json({
        success: false,
        message: 'API key has expired.',
        code: 'AUTH_API_KEY_EXPIRED'
      });
    }

    // Attach service identity
    req.service = {
      name: apiKeyEntry.name,
      permissions: apiKeyEntry.permissions || [],
      metadata: apiKeyEntry.metadata || {}
    };

    next();
  } catch (error) {
    logger.error('API key authentication error:', error);
    return res.status(500).json({
      success: false,
      message: 'API key authentication failed.',
      code: 'AUTH_API_KEY_ERROR'
    });
  }
};

/**
 * Multi-factor Authentication Middleware
 * Checks if MFA is required and validated
 */
const requireMFA = async (req, res, next) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
        code: 'AUTH_NO_USER'
      });
    }

    // Check if user has MFA enabled
    if (!user.mfaEnabled) {
      return next();
    }

    // Check MFA token in header
    const mfaToken = req.headers['x-mfa-token'];

    if (!mfaToken) {
      return res.status(403).json({
        success: false,
        message: 'Multi-factor authentication required.',
        code: 'AUTH_MFA_REQUIRED'
      });
    }

    // Verify MFA token (simplified - in production use proper TOTP verification)
    try {
      const decoded = jwt.verify(mfaToken, config.jwt.secret);
      
      if (decoded.userId !== user._id.toString() || decoded.type !== 'mfa') {
        return res.status(403).json({
          success: false,
          message: 'Invalid MFA token.',
          code: 'AUTH_INVALID_MFA'
        });
      }

      // Check if MFA token is expired (should be short-lived)
      if (decoded.exp < Date.now() / 1000) {
        return res.status(403).json({
          success: false,
          message: 'MFA token expired.',
          code: 'AUTH_MFA_EXPIRED'
        });
      }
    } catch (error) {
      return res.status(403).json({
        success: false,
        message: 'Invalid MFA token.',
        code: 'AUTH_INVALID_MFA'
      });
    }

    next();
  } catch (error) {
    logger.error('MFA middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'MFA verification failed.',
      code: 'AUTH_MFA_ERROR'
    });
  }
};

/**
 * Session Validation Middleware
 * Validates session if session-based auth is used
 */
const validateSession = async (req, res, next) => {
  try {
    const sessionId = req.headers['x-session-id'];

    if (!sessionId && !req.user) {
      return res.status(401).json({
        success: false,
        message: 'Session required.',
        code: 'AUTH_NO_SESSION'
      });
    }

    // If using JWT, session validation is handled by token verification
    if (req.user) {
      return next();
    }

    // Session-based validation (for future implementation)
    // const session = await Session.findById(sessionId);
    // if (!session || !session.isValid()) {
    //   return res.status(401).json({
    //     success: false,
    //     message: 'Invalid session.',
    //     code: 'AUTH_INVALID_SESSION'
    //   });
    // }

    next();
  } catch (error) {
    logger.error('Session validation error:', error);
    return res.status(500).json({
      success: false,
      message: 'Session validation failed.',
      code: 'AUTH_SESSION_ERROR'
    });
  }
};

module.exports = {
  authenticate,
  optionalAuthenticate,
  authenticateApiKey,
  requireMFA,
  validateSession
};