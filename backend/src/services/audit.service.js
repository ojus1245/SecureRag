const AuditLog = require('../models/AuditLog');
const User = require('../models/User');
const logger = require('../utils/logger');
const crypto = require('crypto');

class AuditService {
  /**
   * Create audit log entry
   */
  async createLog(logData) {
    try {
      // Generate request ID if not provided
      if (!logData.requestId) {
        logData.requestId = crypto.randomUUID();
      }

      // Add timestamp if not provided
      if (!logData.timestamp) {
        logData.timestamp = new Date();
      }

      // Create audit log
      const auditLog = new AuditLog(logData);
      await auditLog.save();

      return auditLog;
    } catch (error) {
      logger.error('Create audit log error:', error);
      // Don't throw - audit logging should not break main flow
      return null;
    }
  }

  /**
   * Log security event
   */
  async logSecurityEvent(eventData) {
    try {
      const securityEvent = {
        action: 'SECURITY_EVENT',
        resourceType: 'system',
        timestamp: new Date(),
        ...eventData,
        details: {
          severity: eventData.severity || 'medium',
          eventType: eventData.eventType || 'security_event',
          timestamp: new Date().toISOString(),
          ...eventData.details
        }
      };

      return await this.createLog(securityEvent);
    } catch (error) {
      logger.error('Log security event error:', error);
      return null;
    }
  }

  /**
   * Get audit logs with filters
   */
  async getAuditLogs(filters = {}, pagination = {}) {
    try {
      const {
        startDate,
        endDate,
        userId,
        username,
        action,
        resourceType,
        resourceId,
        status,
        ipAddress,
        search
      } = filters;

      const {
        page = 1,
        limit = 50,
        sortBy = 'timestamp',
        sortOrder = 'desc'
      } = pagination;

      const query = {};

      // Date filters
      if (startDate || endDate) {
        query.timestamp = {};
        if (startDate) query.timestamp.$gte = new Date(startDate);
        if (endDate) query.timestamp.$lte = new Date(endDate);
      }

      // User filters
      if (userId) query.userId = userId;
      if (username) query.username = { $regex: username, $options: 'i' };

      // Action filter
      if (action) query.action = action;

      // Resource filters
      if (resourceType) query.resourceType = resourceType;
      if (resourceId) query.resourceId = resourceId;

      // Status filter
      if (status) query.status = status;

      // IP filter
      if (ipAddress) query.ipAddress = ipAddress;

      // Search
      if (search) {
        query.$or = [
          { 'details.path': { $regex: search, $options: 'i' } },
          { 'details.method': { $regex: search, $options: 'i' } },
          { username: { $regex: search, $options: 'i' } }
        ];
      }

      // Sort
      const sort = {};
      sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

      // Execute query with pagination
      const logs = await AuditLog.find(query)
        .sort(sort)
        .skip((parseInt(page) - 1) * parseInt(limit))
        .limit(parseInt(limit))
        .populate('userId', 'username email fullName')
        .lean();

      const total = await AuditLog.countDocuments(query);

      return {
        logs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
          hasNext: parseInt(page) < Math.ceil(total / parseInt(limit)),
          hasPrev: parseInt(page) > 1
        }
      };
    } catch (error) {
      logger.error('Get audit logs error:', error);
      throw error;
    }
  }

  /**
   * Get audit statistics
   */
  async getAuditStats(filters = {}) {
    try {
      const {
        startDate,
        endDate,
        userId,
        resourceType
      } = filters;

      const matchStage = {};

      if (startDate || endDate) {
        matchStage.timestamp = {};
        if (startDate) matchStage.timestamp.$gte = new Date(startDate);
        if (endDate) matchStage.timestamp.$lte = new Date(endDate);
      }
      if (userId) matchStage.userId = userId;
      if (resourceType) matchStage.resourceType = resourceType;

      const pipeline = [
        { $match: matchStage },
        {
          $facet: {
            summary: [
              {
                $group: {
                  _id: null,
                  totalLogs: { $sum: 1 },
                  successCount: {
                    $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] }
                  },
                  failureCount: {
                    $sum: { $cond: [{ $eq: ['$status', 'failure'] }, 1, 0] }
                  },
                  warningCount: {
                    $sum: { $cond: [{ $eq: ['$status', 'warning'] }, 1, 0] }
                  },
                  uniqueUsers: { $addToSet: '$userId' },
                  uniqueActions: { $addToSet: '$action' },
                  uniqueIPs: { $addToSet: '$ipAddress' }
                }
              }
            ],
            byAction: [
              {
                $group: {
                  _id: '$action',
                  count: { $sum: 1 }
                }
              },
              { $sort: { count: -1 } },
              { $limit: 20 }
            ],
            byResource: [
              {
                $group: {
                  _id: '$resourceType',
                  count: { $sum: 1 }
                }
              },
              { $sort: { count: -1 } }
            ],
            byUser: [
              {
                $group: {
                  _id: '$userId',
                  username: { $first: '$username' },
                  count: { $sum: 1 },
                  lastActivity: { $max: '$timestamp' }
                }
              },
              { $sort: { count: -1 } },
              { $limit: 20 }
            ],
            daily: [
              {
                $group: {
                  _id: {
                    $dateToString: { format: '%Y-%m-%d', date: '$timestamp' }
                  },
                  count: { $sum: 1 }
                }
              },
              { $sort: { _id: -1 } },
              { $limit: 30 }
            ]
          }
        }
      ];

      const results = await AuditLog.aggregate(pipeline);
      return results[0];
    } catch (error) {
      logger.error('Get audit stats error:', error);
      throw error;
    }
  }

  /**
   * Get security events
   */
  async getSecurityEvents(filters = {}, pagination = {}) {
    try {
      const { severity, eventType } = filters;
      const { page = 1, limit = 50 } = pagination;

      const query = {
        action: 'SECURITY_EVENT'
      };

      if (severity) {
        query['details.severity'] = severity;
      }
      if (eventType) {
        query['details.eventType'] = eventType;
      }

      const events = await AuditLog.find(query)
        .sort({ timestamp: -1 })
        .skip((parseInt(page) - 1) * parseInt(limit))
        .limit(parseInt(limit))
        .populate('userId', 'username email')
        .lean();

      const total = await AuditLog.countDocuments(query);

      // Get severity distribution
      const severityStats = await AuditLog.aggregate([
        { $match: { action: 'SECURITY_EVENT' } },
        {
          $group: {
            _id: '$details.severity',
            count: { $sum: 1 }
          }
        }
      ]);

      return {
        events,
        severityStats,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      };
    } catch (error) {
      logger.error('Get security events error:', error);
      throw error;
    }
  }

  /**
   * Get user audit trail
   */
  async getUserAuditTrail(userId, filters = {}, pagination = {}) {
    try {
      const { startDate, endDate } = filters;
      const { page = 1, limit = 50 } = pagination;

      const query = { userId };

      if (startDate || endDate) {
        query.timestamp = {};
        if (startDate) query.timestamp.$gte = new Date(startDate);
        if (endDate) query.timestamp.$lte = new Date(endDate);
      }

      const logs = await AuditLog.find(query)
        .sort({ timestamp: -1 })
        .skip((parseInt(page) - 1) * parseInt(limit))
        .limit(parseInt(limit))
        .lean();

      const total = await AuditLog.countDocuments(query);

      // Get user summary
      const summary = await AuditLog.aggregate([
        { $match: { userId: userId } },
        {
          $group: {
            _id: '$action',
            count: { $sum: 1 },
            lastActivity: { $max: '$timestamp' },
            firstActivity: { $min: '$timestamp' }
          }
        },
        { $sort: { count: -1 } }
      ]);

      return {
        userId,
        logs,
        summary,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      };
    } catch (error) {
      logger.error('Get user audit trail error:', error);
      throw error;
    }
  }

  /**
   * Export audit logs
   */
  async exportAuditLogs(filters = {}, format = 'json') {
    try {
      const { startDate, endDate, action, resourceType } = filters;

      const query = {};
      if (startDate || endDate) {
        query.timestamp = {};
        if (startDate) query.timestamp.$gte = new Date(startDate);
        if (endDate) query.timestamp.$lte = new Date(endDate);
      }
      if (action) query.action = action;
      if (resourceType) query.resourceType = resourceType;

      const logs = await AuditLog.find(query)
        .sort({ timestamp: -1 })
        .limit(10000)
        .lean();

      if (format === 'csv') {
        return this.convertToCSV(logs);
      }

      return {
        exportDate: new Date().toISOString(),
        totalLogs: logs.length,
        logs
      };
    } catch (error) {
      logger.error('Export audit logs error:', error);
      throw error;
    }
  }

  /**
   * Convert logs to CSV format
   */
  convertToCSV(logs) {
    const headers = [
      'Timestamp',
      'User',
      'Action',
      'Resource Type',
      'Resource ID',
      'Status',
      'IP Address'
    ];

    const rows = logs.map(log => [
      log.timestamp,
      log.username,
      log.action,
      log.resourceType,
      log.resourceId,
      log.status,
      log.ipAddress
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    return csvContent;
  }

  /**
   * Clean up old audit logs
   */
  async cleanupAuditLogs(retentionDays = 365) {
    try {
      const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

      const result = await AuditLog.deleteMany({
        timestamp: { $lt: cutoffDate }
      });

      logger.info(`Audit log cleanup: ${result.deletedCount} logs deleted`);

      return {
        deletedCount: result.deletedCount,
        cutoffDate
      };
    } catch (error) {
      logger.error('Cleanup audit logs error:', error);
      throw error;
    }
  }

  /**
   * Get audit log by ID
   */
  async getAuditLogById(logId) {
    try {
      return await AuditLog.findById(logId)
        .populate('userId', 'username email fullName')
        .lean();
    } catch (error) {
      logger.error('Get audit log by ID error:', error);
      throw error;
    }
  }
}

module.exports = new AuditService();