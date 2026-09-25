const mongoose = require('mongoose');
const AuditLog = require('../models/AuditLog');
const logger = require('../utils/logger');
const { validationResult } = require('express-validator');

class AuditController {
  /**
   * @desc    Get audit logs with filters
   * @route   GET /api/audit
   * @access  Private (Auditor/Admin)
   */
  async getAuditLogs(req, res) {
    try {
      const {
        page = 1,
        limit = 50,
        startDate,
        endDate,
        userId,
        username,
        action,
        resourceType,
        resourceId,
        status,
        ipAddress,
        sortBy = 'timestamp',
        sortOrder = 'desc'
      } = req.query;

      const filter = {};
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);

      // Date range filter
      if (startDate || endDate) {
        filter.timestamp = {};
        if (startDate) filter.timestamp.$gte = new Date(startDate);
        if (endDate) filter.timestamp.$lte = new Date(endDate);
      }

      // User filters
      if (userId) filter.userId = userId;
      if (username) filter.username = { $regex: username, $options: 'i' };
      
      // Action filter
      if (action) filter.action = action;
      
      // Resource filters
      if (resourceType) filter.resourceType = resourceType;
      if (resourceId) filter.resourceId = resourceId;
      
      // Status filter
      if (status) filter.status = status;
      
      // IP filter
      if (ipAddress) filter.ipAddress = ipAddress;

      // Sort
      const sort = {};
      sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

      // Execute query with pagination
      const logs = await AuditLog.find(filter)
        .sort(sort)
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .populate('userId', 'username email fullName')
        .lean();

      const total = await AuditLog.countDocuments(filter);

      res.status(200).json({
        success: true,
        data: {
          logs,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            pages: Math.ceil(total / limitNum),
            hasNext: pageNum < Math.ceil(total / limitNum),
            hasPrev: pageNum > 1
          }
        }
      });
    } catch (error) {
      logger.error('Get audit logs error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve audit logs'
      });
    }
  }

  /**
   * @desc    Get audit log by ID
   * @route   GET /api/audit/:logId
   * @access  Private (Auditor/Admin)
   */
  async getAuditLogById(req, res) {
    try {
      const log = await AuditLog.findById(req.params.logId)
        .populate('userId', 'username email fullName')
        .lean();

      if (!log) {
        return res.status(404).json({
          success: false,
          message: 'Audit log not found'
        });
      }

      res.status(200).json({
        success: true,
        data: log
      });
    } catch (error) {
      logger.error('Get audit log by ID error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve audit log'
      });
    }
  }

  /**
   * @desc    Get audit statistics
   * @route   GET /api/audit/stats
   * @access  Private (Auditor/Admin)
   */
  async getAuditStats(req, res) {
    try {
      const { startDate, endDate, userId, resourceType } = req.query;

      const filter = {};
      
      // Apply filters
      if (startDate || endDate) {
        filter.timestamp = {};
        if (startDate) filter.timestamp.$gte = new Date(startDate);
        if (endDate) filter.timestamp.$lte = new Date(endDate);
      }
      if (userId) filter.userId = userId;
      if (resourceType) filter.resourceType = resourceType;

      // Get overall statistics
      const overallStats = await AuditLog.aggregate([
        { $match: filter },
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
      ]);

      // Get action statistics
      const actionStats = await AuditLog.aggregate([
        { $match: filter },
        {
          $group: {
            _id: '$action',
            count: { $sum: 1 },
            successCount: {
              $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] }
            },
            failureCount: {
              $sum: { $cond: [{ $eq: ['$status', 'failure'] }, 1, 0] }
            }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 20 }
      ]);

      // Get resource type statistics
      const resourceStats = await AuditLog.aggregate([
        { $match: filter },
        {
          $group: {
            _id: '$resourceType',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } }
      ]);

      // Get user statistics
      const userStats = await AuditLog.aggregate([
        { $match: filter },
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
      ]);

      // Get daily statistics
      const dailyStats = await AuditLog.aggregate([
        { $match: filter },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$timestamp' }
            },
            count: { $sum: 1 },
            successCount: {
              $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] }
            },
            failureCount: {
              $sum: { $cond: [{ $eq: ['$status', 'failure'] }, 1, 0] }
            }
          }
        },
        { $sort: { _id: -1 } },
        { $limit: 30 }
      ]);

      // Get hourly distribution
      const hourlyStats = await AuditLog.aggregate([
        { $match: filter },
        {
          $group: {
            _id: { $hour: '$timestamp' },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]);

      res.status(200).json({
        success: true,
        data: {
          summary: overallStats[0] ? {
            totalLogs: overallStats[0].totalLogs,
            successCount: overallStats[0].successCount,
            failureCount: overallStats[0].failureCount,
            warningCount: overallStats[0].warningCount,
            uniqueUsers: overallStats[0].uniqueUsers.length,
            uniqueActions: overallStats[0].uniqueActions.length,
            uniqueIPs: overallStats[0].uniqueIPs.length
          } : {
            totalLogs: 0,
            successCount: 0,
            failureCount: 0,
            warningCount: 0,
            uniqueUsers: 0,
            uniqueActions: 0,
            uniqueIPs: 0
          },
          byAction: actionStats,
          byResource: resourceStats,
          byUser: userStats,
          daily: dailyStats,
          hourly: hourlyStats
        }
      });
    } catch (error) {
      logger.error('Get audit stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve audit statistics'
      });
    }
  }

  /**
   * @desc    Get security events
   * @route   GET /api/audit/security-events
   * @access  Private (Admin)
   */
  async getSecurityEvents(req, res) {
    try {
      const { page = 1, limit = 50, severity } = req.query;

      const filter = {
        action: 'SECURITY_EVENT'
      };

      // Severity filter
      if (severity) {
        filter['details.severity'] = severity;
      }

      const events = await AuditLog.find(filter)
        .sort({ timestamp: -1 })
        .skip((parseInt(page) - 1) * parseInt(limit))
        .limit(parseInt(limit))
        .populate('userId', 'username email')
        .lean();

      const total = await AuditLog.countDocuments(filter);

      // Group by severity
      const severityStats = await AuditLog.aggregate([
        { $match: { action: 'SECURITY_EVENT' } },
        {
          $group: {
            _id: '$details.severity',
            count: { $sum: 1 }
          }
        }
      ]);

      res.status(200).json({
        success: true,
        data: {
          events,
          severityStats,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
          }
        }
      });
    } catch (error) {
      logger.error('Get security events error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve security events'
      });
    }
  }

  /**
   * @desc    Get user audit trail
   * @route   GET /api/audit/user/:userId
   * @access  Private (Auditor/Admin)
   */
  async getUserAuditTrail(req, res) {
    try {
      const { userId } = req.params;
      const { page = 1, limit = 50, startDate, endDate } = req.query;

      const filter = { userId };

      if (startDate || endDate) {
        filter.timestamp = {};
        if (startDate) filter.timestamp.$gte = new Date(startDate);
        if (endDate) filter.timestamp.$lte = new Date(endDate);
      }

      const logs = await AuditLog.find(filter)
        .sort({ timestamp: -1 })
        .skip((parseInt(page) - 1) * parseInt(limit))
        .limit(parseInt(limit))
        .lean();

      const total = await AuditLog.countDocuments(filter);

      // Get user summary
      const summary = await AuditLog.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(userId) } },
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

      res.status(200).json({
        success: true,
        data: {
          userId,
          logs,
          summary,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
          }
        }
      });
    } catch (error) {
      logger.error('Get user audit trail error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve user audit trail'
      });
    }
  }

  /**
   * @desc    Export audit logs
   * @route   GET /api/audit/export
   * @access  Private (Admin)
   */
  async exportAuditLogs(req, res) {
    try {
      const { format = 'json', startDate, endDate } = req.query;

      const filter = {};
      if (startDate || endDate) {
        filter.timestamp = {};
        if (startDate) filter.timestamp.$gte = new Date(startDate);
        if (endDate) filter.timestamp.$lte = new Date(endDate);
      }

      const logs = await AuditLog.find(filter)
        .sort({ timestamp: -1 })
        .limit(10000) // Limit export to prevent memory issues
        .lean();

      if (format === 'csv') {
        // Generate CSV
        const csvHeaders = 'Timestamp,User,Action,Resource Type,Resource ID,Status,IP Address\n';
        const csvRows = logs.map(log => {
          return [
            log.timestamp,
            log.username,
            log.action,
            log.resourceType,
            log.resourceId,
            log.status,
            log.ipAddress
          ].join(',');
        }).join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=audit-logs-${Date.now()}.csv`);
        return res.send(csvHeaders + csvRows);
      }

      // Default JSON export
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=audit-logs-${Date.now()}.json`);
      
      res.status(200).json({
        success: true,
        data: {
          exportDate: new Date().toISOString(),
          totalLogs: logs.length,
          logs
        }
      });
    } catch (error) {
      logger.error('Export audit logs error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to export audit logs'
      });
    }
  }

  /**
   * @desc    Delete old audit logs
   * @route   DELETE /api/audit/cleanup
   * @access  Private (Admin)
   */
  async cleanupAuditLogs(req, res) {
    try {
      const { beforeDate, retentionDays = 365 } = req.body;

      // Calculate cutoff date
      const cutoffDate = beforeDate 
        ? new Date(beforeDate) 
        : new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

      // Delete logs older than cutoff
      const result = await AuditLog.deleteMany({
        timestamp: { $lt: cutoffDate }
      });

      logger.info(`Audit log cleanup: ${result.deletedCount} logs deleted by ${req.user.username}`);

      res.status(200).json({
        success: true,
        message: 'Audit logs cleaned up successfully',
        data: {
          deletedCount: result.deletedCount,
          cutoffDate: cutoffDate
        }
      });
    } catch (error) {
      logger.error('Cleanup audit logs error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to clean up audit logs'
      });
    }
  }

  /**
   * @desc    Get trend analytics
   * @route   GET /api/audit/analytics/trends
   * @access  Private (Admin)
   */
  async getTrendAnalytics(req, res) {
    try {
      const { startDate, endDate, interval = 'daily' } = req.query;

      const filter = {};
      if (startDate || endDate) {
        filter.timestamp = {};
        if (startDate) filter.timestamp.$gte = new Date(startDate);
        if (endDate) filter.timestamp.$lte = new Date(endDate);
      }

      let dateFormat = '%Y-%m-%d';
      if (interval === 'hourly') dateFormat = '%Y-%m-%d %H:00';
      else if (interval === 'weekly') dateFormat = '%Y-%U';
      else if (interval === 'monthly') dateFormat = '%Y-%m';

      const trends = await AuditLog.aggregate([
        { $match: filter },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: dateFormat, date: '$timestamp' } },
              action: '$action'
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.date': 1 } }
      ]);

      res.status(200).json({
        success: true,
        data: {
          interval,
          trends
        }
      });
    } catch (error) {
      logger.error('Get trend analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve trend analytics'
      });
    }
  }

  /**
   * @desc    Get user analytics
   * @route   GET /api/audit/analytics/users
   * @access  Private (Admin)
   */
  async getUserAnalytics(req, res) {
    try {
      const { startDate, endDate, limit = 20 } = req.query;

      const filter = {};
      if (startDate || endDate) {
        filter.timestamp = {};
        if (startDate) filter.timestamp.$gte = new Date(startDate);
        if (endDate) filter.timestamp.$lte = new Date(endDate);
      }

      const userAnalytics = await AuditLog.aggregate([
        { $match: filter },
        {
          $group: {
            _id: '$userId',
            username: { $first: '$username' },
            totalActions: { $sum: 1 },
            successActions: {
              $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] }
            },
            failureActions: {
              $sum: { $cond: [{ $eq: ['$status', 'failure'] }, 1, 0] }
            },
            lastActive: { $max: '$timestamp' }
          }
        },
        { $sort: { totalActions: -1 } },
        { $limit: parseInt(limit) }
      ]);

      res.status(200).json({
        success: true,
        data: {
          users: userAnalytics
        }
      });
    } catch (error) {
      logger.error('Get user analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve user analytics'
      });
    }
  }
}

module.exports = new AuditController();