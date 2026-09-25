const AuditLog = require('../models/AuditLog');
const logger = require('../utils/logger');
const crypto = require('crypto');

/**
 * Audit Logger Middleware
 * Automatically logs all API requests to audit trail
 */
const auditLogger = async (req, res, next) => {
  // Generate unique request ID
  req.requestId = crypto.randomUUID();
  
  // Store start time for response time calculation
  req._startTime = Date.now();
  
  // Store original send function
  const originalSend = res.send;
  const originalJson = res.json;
  const originalEnd = res.end;
  
  // Flag to track if response was sent
  let responseSent = false;
  
  // Override send function
  res.send = function(data) {
    responseSent = true;
    processAuditLog(req, res, data);
    return originalSend.call(this, data);
  };
  
  // Override json function
  res.json = function(data) {
    responseSent = true;
    processAuditLog(req, res, data);
    return originalJson.call(this, data);
  };
  
  // Override end function
  res.end = function(data) {
    if (!responseSent) {
      responseSent = true;
      processAuditLog(req, res, data);
    }
    return originalEnd.call(this, data);
  };
  
  next();
};

/**
 * Process audit log event (internal function)
 */
const processAuditLog = async (req, res, data) => {
  try {
    // Only log API requests
    if (!req.path.startsWith('/api/')) {
      return;
    }
    
    // Skip health check endpoints
    if (req.path === '/health' || req.path === '/api/health') {
      return;
    }
    
    // Skip OPTIONS requests (CORS preflight)
    if (req.method === 'OPTIONS') {
      return;
    }
    
    // Calculate response time
    const responseTime = Date.now() - req._startTime;
    
    // Sanitize request body
    const sanitizedBody = sanitizeData(req.body);
    
    // Sanitize response data
    const sanitizedResponse = sanitizeData(data);
    
    // Determine action from request
    const action = getActionFromRequest(req);
    
    // Determine resource type
    const resourceType = getResourceType(req);
    
    // Determine status
    const status = res.statusCode < 400 ? 'success' : 
                   res.statusCode < 500 ? 'failure' : 'error';
    
    // Create audit log entry
    const auditData = {
      timestamp: new Date(),
      userId: req.user?._id || req.userId,
      username: req.user?.username || 'anonymous',
      action,
      resourceType,
      resourceId: req.params.id || req.params.documentId || req.params.userId,
      ipAddress: getClientIP(req),
      userAgent: req.get('user-agent'),
      requestId: req.requestId,
      details: {
        method: req.method,
        path: req.path,
        query: sanitizeQuery(req.query),
        body: sanitizedBody,
        response: sanitizedResponse,
        statusCode: res.statusCode,
        responseTime,
        headers: sanitizeHeaders(req.headers)
      },
      status,
      sessionId: req.session?.id || req.headers['x-session-id'],
      metadata: {
        requestSize: JSON.stringify(req.body).length,
        responseSize: JSON.stringify(data).length,
        route: req.route?.path,
        apiVersion: req.headers['x-api-version'] || 'v1'
      }
    };
    
    // Create audit log asynchronously (don't block response)
    AuditLog.createLog(auditData).catch(err => {
      logger.error('Failed to create audit log:', err);
    });
    
    // Log to application logger for real-time monitoring
    if (status === 'failure' || status === 'error') {
      logger.error('Request failed:', {
        requestId: req.requestId,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        responseTime,
        userId: req.user?.username
      });
    }
  } catch (error) {
    logger.error('Audit logging error:', error);
  }
};

/**
 * Get action from request
 */
const getActionFromRequest = (req) => {
  const method = req.method;
  const path = req.path;
  
  // Authentication actions
  if (path.includes('/auth/login')) return 'LOGIN';
  if (path.includes('/auth/logout')) return 'LOGOUT';
  if (path.includes('/auth/register')) return 'USER_CREATE';
  if (path.includes('/auth/change-password')) return 'USER_UPDATE';
  
  // Document actions
  if (path.includes('/documents')) {
    if (path.includes('/share')) return 'DOCUMENT_SHARE';
    if (path.includes('/download')) return 'DOCUMENT_DOWNLOAD';
    
    switch (method) {
      case 'POST': return 'DOCUMENT_CREATE';
      case 'GET': return 'DOCUMENT_READ';
      case 'PUT':
      case 'PATCH': return 'DOCUMENT_UPDATE';
      case 'DELETE': return 'DOCUMENT_DELETE';
    }
  }
  
  // Chat actions
  if (path.includes('/chat')) {
    if (path.includes('/query')) return 'CHAT_QUERY';
    if (path.includes('/feedback')) return 'CHAT_FEEDBACK';
    return 'CHAT_ACTION';
  }
  
  // User management actions
  if (path.includes('/users')) {
    switch (method) {
      case 'POST': return 'USER_CREATE';
      case 'GET': return 'USER_READ';
      case 'PUT':
      case 'PATCH': return 'USER_UPDATE';
      case 'DELETE': return 'USER_DELETE';
    }
  }
  
  // Audit actions
  if (path.includes('/audit')) {
    return 'AUDIT_VIEW';
  }
  
  // Default action
  return `${method}_${path.split('/').pop()}`.toUpperCase();
};

/**
 * Get resource type from request
 */
const getResourceType = (req) => {
  const path = req.path;
  
  if (path.includes('/documents')) return 'document';
  if (path.includes('/chat')) return 'chat';
  if (path.includes('/users')) return 'user';
  if (path.includes('/audit')) return 'audit';
  if (path.includes('/roles')) return 'role';
  if (path.includes('/auth')) return 'auth';
  
  return 'system';
};

/**
 * Get client IP address
 */
const getClientIP = (req) => {
  return req.headers['x-forwarded-for']?.split(',')[0].trim() ||
         req.headers['x-real-ip'] ||
         req.connection?.remoteAddress ||
         req.socket?.remoteAddress ||
         req.ip;
};

/**
 * Sanitize data for audit logging
 */
const sanitizeData = (data) => {
  if (!data) return null;
  
  try {
    if (typeof data === 'string') {
      // Try to parse JSON string
      try {
        data = JSON.parse(data);
      } catch (e) {
        // Not JSON, return as is
        return data.substring(0, 1000); // Limit length
      }
    }
    
    if (typeof data === 'object') {
      const sanitized = { ...data };
      
      // Remove sensitive fields
      const sensitiveFields = [
        'password',
        'token',
        'refreshToken',
        'accessToken',
        'encryptedContent',
        'encryptedEmbedding',
        'content',
        'secret',
        'apiKey',
        'authorization',
        'cookie',
        'cookies'
      ];
      
      sensitiveFields.forEach(field => {
        if (sanitized[field]) {
          sanitized[field] = '[REDACTED]';
        }
      });
      
      // Truncate long strings
      Object.keys(sanitized).forEach(key => {
        if (typeof sanitized[key] === 'string' && sanitized[key].length > 500) {
          sanitized[key] = sanitized[key].substring(0, 500) + '...';
        }
      });
      
      return sanitized;
    }
    
    return data;
  } catch (error) {
    return '[SERIALIZATION_ERROR]';
  }
};

/**
 * Sanitize query parameters
 */
const sanitizeQuery = (query) => {
  if (!query) return null;
  
  const sanitized = { ...query };
  
  // Remove sensitive query parameters
  const sensitiveParams = ['token', 'password', 'apiKey', 'secret'];
  sensitiveParams.forEach(param => {
    if (sanitized[param]) {
      sanitized[param] = '[REDACTED]';
    }
  });
  
  return sanitized;
};

/**
 * Sanitize headers
 */
const sanitizeHeaders = (headers) => {
  if (!headers) return null;
  
  const sanitized = { ...headers };
  
  // Remove sensitive headers
  const sensitiveHeaders = [
    'authorization',
    'cookie',
    'x-api-key',
    'x-mfa-token',
    'x-session-id'
  ];
  
  sensitiveHeaders.forEach(header => {
    if (sanitized[header]) {
      sanitized[header] = '[REDACTED]';
    }
  });
  
  return sanitized;
};

/**
 * Manual audit logging helper
 * Can be used in controllers/services to log specific events
 */
const logAuditEvent = async (data) => {
  try {
    return await AuditLog.createLog(data);
  } catch (error) {
    logger.error('Manual audit logging error:', error);
    return null;
  }
};

/**
 * Security event logger
 * Specifically for security-related events
 */
const logSecurityEvent = async (eventData) => {
  try {
    const securityEvent = {
      action: 'SECURITY_EVENT',
      resourceType: 'system',
      ...eventData,
      details: {
        ...eventData.details,
        severity: eventData.severity || 'medium',
        eventType: eventData.eventType || 'security_event',
        timestamp: new Date().toISOString()
      }
    };
    
    return await AuditLog.createLog(securityEvent);
  } catch (error) {
    logger.error('Security event logging error:', error);
    return null;
  }
};

// Export functions
module.exports = {
  auditLogger,
  logAuditEvent,
  logSecurityEvent
};