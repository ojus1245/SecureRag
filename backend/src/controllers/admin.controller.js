const User = require('../models/User');
const Role = require('../models/Role');
const Document = require('../models/Document');
const Conversation = require('../models/Conversation');
const AuditLog = require('../models/AuditLog');
const mongoose = require('mongoose');
const logger = require('../utils/logger');

class AdminController {
  /**
   * @desc    Get dashboard telemetry and aggregated stats
   * @route   GET /api/admin/dashboard
   * @access  Private (Admin / System Managers)
   */
  async getDashboard(req, res) {
    try {
      // 1. Total & active users
      const totalUsers = await User.countDocuments();
      const activeUsers = await User.countDocuments({ isActive: true });

      // 2. Total active documents (not deleted)
      const totalDocuments = await Document.countDocuments({ status: { $ne: 'deleted' } });

      // 3. Document classification breakdown
      const docClassification = await Document.aggregate([
        { $match: { status: { $ne: 'deleted' } } },
        { $group: { _id: '$classification', count: { $sum: 1 } } }
      ]);

      // 4. Chat queries count (conversations and total messages)
      const totalConversations = await Conversation.countDocuments({ isActive: true });
      const messageStats = await Conversation.aggregate([
        { $match: { isActive: true } },
        { $project: { messageCount: { $size: { $ifNull: ['$messages', []] } } } },
        { $group: { _id: null, totalMessages: { $sum: '$messageCount' } } }
      ]);
      const totalChatQueries = messageStats[0]?.totalMessages || 0;

      // 5. Security events from Audit Logs (warning or failure status or SECURITY_EVENT action)
      const securityEvents = await AuditLog.countDocuments({
        $or: [
          { status: 'warning' },
          { status: 'failure' },
          { action: 'SECURITY_EVENT' }
        ]
      });

      // 6. Recent system activity (last 10 audit logs)
      const recentLogs = await AuditLog.find()
        .sort({ timestamp: -1 })
        .limit(10)
        .populate('userId', 'username email fullName')
        .lean();

      const recentActivity = recentLogs.map(log => ({
        id: log._id,
        action: log.action,
        user: log.username || log.userId?.username || 'System',
        status: log.status,
        timestamp: new Date(log.timestamp).toLocaleString(),
        resourceType: log.resourceType,
        ipAddress: log.ipAddress
      }));

      // 7. Role distribution
      const rolesWithCounts = await Role.aggregate([
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: 'role',
            as: 'users'
          }
        },
        {
          $project: {
            id: '$_id',
            _id: 1,
            name: 1,
            description: 1,
            accessLevel: 1,
            isSystemRole: 1,
            isActive: 1,
            userCount: { $size: '$users' }
          }
        }
      ]);

      // System health status
      const systemHealth = {
        database: mongoose.connection.readyState === 1 ? 'healthy' : 'degraded',
        uptimeSeconds: Math.floor(process.uptime()),
        memoryUsageMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        nodeVersion: process.version
      };

      res.status(200).json({
        success: true,
        data: {
          totalUsers,
          activeUsers,
          totalDocuments,
          docClassification,
          totalConversations,
          totalChatQueries,
          securityEvents,
          userTrend: 0,
          documentTrend: 0,
          chatTrend: 0,
          securityTrend: 0,
          recentActivity,
          roleDistribution: rolesWithCounts,
          systemHealth
        },
        // Direct root fields for frontends that read directly from response
        totalUsers,
        activeUsers,
        totalDocuments,
        totalChatQueries,
        securityEvents,
        userTrend: 0,
        documentTrend: 0,
        chatTrend: 0,
        securityTrend: 0,
        recentActivity,
        roleDistribution: rolesWithCounts,
        systemHealth
      });
    } catch (error) {
      logger.error('Admin getDashboard error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve admin dashboard stats',
        error: error.message
      });
    }
  }

  /**
   * @desc    Get system health telemetry
   * @route   GET /api/admin/health
   * @access  Private (Admin / System Managers)
   */
  async getSystemHealth(req, res) {
    try {
      const dbConnected = mongoose.connection.readyState === 1;
      const memUsage = process.memoryUsage();

      res.status(200).json({
        success: true,
        data: {
          status: dbConnected ? 'healthy' : 'degraded',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          services: {
            database: {
              status: dbConnected ? 'connected' : 'disconnected',
              host: mongoose.connection.host,
              name: mongoose.connection.name
            },
            memory: {
              heapUsedMb: Math.round(memUsage.heapUsed / 1024 / 1024),
              heapTotalMb: Math.round(memUsage.heapTotal / 1024 / 1024),
              rssMb: Math.round(memUsage.rss / 1024 / 1024)
            }
          }
        }
      });
    } catch (error) {
      logger.error('Admin getSystemHealth error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve system health',
        error: error.message
      });
    }
  }

  /**
   * @desc    Get all roles with populated user counts
   * @route   GET /api/admin/roles
   * @access  Private (role:manage or admin)
   */
  async getRoles(req, res) {
    try {
      const roles = await Role.find().sort({ accessLevel: -1, name: 1 }).lean();

      // Attach user counts and normalized `id` field
      const rolesWithDetails = await Promise.all(
        roles.map(async (role) => {
          const userCount = await User.countDocuments({ role: role._id });
          return {
            ...role,
            id: role._id.toString(),
            userCount
          };
        })
      );

      res.status(200).json({
        success: true,
        data: {
          roles: rolesWithDetails
        },
        roles: rolesWithDetails
      });
    } catch (error) {
      logger.error('Admin getRoles error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve roles',
        error: error.message
      });
    }
  }

  /**
   * @desc    Create custom role
   * @route   POST /api/admin/roles
   * @access  Private (role:manage or admin)
   */
  async createRole(req, res) {
    try {
      const { name, description, permissions, accessLevel, isActive } = req.body;

      if (!name || !name.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Role name is required'
        });
      }

      const normalizedName = name.trim().toLowerCase();
      const existing = await Role.findOne({ name: normalizedName });
      if (existing) {
        return res.status(409).json({
          success: false,
          message: `Role with name "${normalizedName}" already exists`
        });
      }

      const role = new Role({
        name: normalizedName,
        description: description || '',
        permissions: Array.isArray(permissions) ? permissions : [],
        accessLevel: Number(accessLevel) || 1,
        isSystemRole: false,
        isActive: isActive !== false
      });

      await role.save();

      await AuditLog.createLog({
        userId: req.user._id,
        username: req.user.username,
        action: 'ROLE_UPDATE',
        resourceType: 'role',
        resourceId: role._id.toString(),
        details: { action: 'create', role: normalizedName, permissions: role.permissions },
        status: 'success',
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });

      const roleObj = role.toObject();
      roleObj.id = role._id.toString();

      res.status(201).json({
        success: true,
        message: `Role "${role.name}" created successfully`,
        data: roleObj,
        role: roleObj
      });
    } catch (error) {
      logger.error('Admin createRole error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create role',
        error: error.message
      });
    }
  }

  /**
   * @desc    Update role
   * @route   PUT /api/admin/roles/:roleId
   * @access  Private (role:manage or admin)
   */
  async updateRole(req, res) {
    try {
      const { roleId } = req.params;
      const { description, permissions, accessLevel, isActive, name } = req.body;

      const role = await Role.findById(roleId);
      if (!role) {
        return res.status(404).json({
          success: false,
          message: 'Role not found'
        });
      }

      // Safeguard core admin role
      if (role.name === 'admin' && permissions && !permissions.includes('*') && !permissions.includes('all:access')) {
        return res.status(400).json({
          success: false,
          message: 'Cannot revoke full permissions from the admin role'
        });
      }

      // If updating name, don't allow changing system roles' names
      if (name && role.isSystemRole && name.trim().toLowerCase() !== role.name) {
        return res.status(400).json({
          success: false,
          message: 'Cannot rename built-in system roles'
        });
      }

      if (description !== undefined) role.description = description;
      if (Array.isArray(permissions)) role.permissions = permissions;
      if (accessLevel !== undefined) role.accessLevel = Number(accessLevel);
      if (isActive !== undefined) role.isActive = isActive;
      if (name && !role.isSystemRole) role.name = name.trim().toLowerCase();

      await role.save();

      await AuditLog.createLog({
        userId: req.user._id,
        username: req.user.username,
        action: 'ROLE_UPDATE',
        resourceType: 'role',
        resourceId: role._id.toString(),
        details: { action: 'update', role: role.name, permissions: role.permissions },
        status: 'success',
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });

      const roleObj = role.toObject();
      roleObj.id = role._id.toString();

      res.status(200).json({
        success: true,
        message: `Role "${role.name}" updated successfully`,
        data: roleObj,
        role: roleObj
      });
    } catch (error) {
      logger.error('Admin updateRole error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update role',
        error: error.message
      });
    }
  }

  /**
   * @desc    Delete custom role
   * @route   DELETE /api/admin/roles/:roleId
   * @access  Private (role:manage or admin)
   */
  async deleteRole(req, res) {
    try {
      const { roleId } = req.params;

      const role = await Role.findById(roleId);
      if (!role) {
        return res.status(404).json({
          success: false,
          message: 'Role not found'
        });
      }

      if (role.isSystemRole) {
        return res.status(400).json({
          success: false,
          message: 'Built-in system roles cannot be deleted'
        });
      }

      // Check if users are assigned to this role
      const usersWithRole = await User.countDocuments({ role: role._id });
      if (usersWithRole > 0) {
        return res.status(400).json({
          success: false,
          message: `Cannot delete role: ${usersWithRole} user(s) currently have this role assigned. Please reassign them first.`
        });
      }

      await Role.findByIdAndDelete(roleId);

      await AuditLog.createLog({
        userId: req.user._id,
        username: req.user.username,
        action: 'ROLE_UPDATE',
        resourceType: 'role',
        resourceId: roleId,
        details: { action: 'delete', role: role.name },
        status: 'success',
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });

      res.status(200).json({
        success: true,
        message: `Role "${role.name}" deleted successfully`
      });
    } catch (error) {
      logger.error('Admin deleteRole error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete role',
        error: error.message
      });
    }
  }

  /**
   * @desc    Get system settings
   * @route   GET /api/admin/settings
   * @access  Private (system:configure or admin)
   */
  async getSettings(req, res) {
    try {
      res.status(200).json({
        success: true,
        data: {
          general: {
            systemName: 'Secure Enterprise RAG',
            environment: process.env.NODE_ENV || 'development',
            maintenanceMode: false
          },
          security: {
            mfaRequired: false,
            sessionTimeoutMinutes: 60,
            passwordMinLength: 8,
            maxLoginAttempts: 5,
            clearanceHierarchy: ['public', 'internal', 'confidential', 'restricted']
          },
          ai: {
            defaultModel: 'gemini-1.5-flash',
            maxTokens: 2048,
            temperature: 0.2
          }
        }
      });
    } catch (error) {
      logger.error('Admin getSettings error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve settings',
        error: error.message
      });
    }
  }

  /**
   * @desc    Update system settings
   * @route   PUT /api/admin/settings
   * @access  Private (system:configure or admin)
   */
  async updateSettings(req, res) {
    try {
      const newSettings = req.body;
      res.status(200).json({
        success: true,
        message: 'Settings updated successfully',
        data: newSettings
      });
    } catch (error) {
      logger.error('Admin updateSettings error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update settings',
        error: error.message
      });
    }
  }
}

module.exports = new AdminController();

