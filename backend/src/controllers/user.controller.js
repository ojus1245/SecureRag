const mongoose = require('mongoose');
const User = require('../models/User');
const Role = require('../models/Role');
const Document = require('../models/Document');
const DocumentACL = require('../models/DocumentACL');
const logger = require('../utils/logger');
const { validationResult } = require('express-validator');

class UserController {
  /**
   * @desc    Get all users
   * @route   GET /api/users
   * @access  Private (Admin/Manager)
   */
  async getAllUsers(req, res) {
    try {
      const { 
        page = 1, 
        limit = 20, 
        search, 
        department, 
        isActive,
        role,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      const filter = {};
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);

      // Build filters
      if (department) filter.department = department;
      if (role) filter.role = role;
      if (isActive !== undefined) filter.isActive = isActive === 'true';
      
      // Search
      if (search) {
        filter.$or = [
          { username: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { fullName: { $regex: search, $options: 'i' } }
        ];
      }

      // Sort
      const sort = {};
      sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

      // Execute query
      const users = await User.find(filter)
        .populate('role', 'name description permissions')
        .select('-password')
        .sort(sort)
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean();

      const total = await User.countDocuments(filter);

      res.status(200).json({
        success: true,
        data: {
          users,
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
      logger.error('Get all users error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get users'
      });
    }
  }

  /**
   * @desc    Get user by ID
   * @route   GET /api/users/:userId
   * @access  Private (Admin/Manager)
   */
  async getUserById(req, res) {
    try {
      const user = await User.findById(req.params.userId)
        .populate('role', 'name description permissions')
        .select('-password')
        .lean();

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Get user's documents count
      const documentCount = await Document.countDocuments({ owner: user._id });
      
      // Get user's shared documents
      const sharedDocuments = await DocumentACL.find({
        user: user._id,
        isActive: true
      }).countDocuments();

      res.status(200).json({
        success: true,
        data: {
          ...user,
          stats: {
            documentsOwned: documentCount,
            documentsShared: sharedDocuments
          }
        }
      });
    } catch (error) {
      logger.error('Get user by ID error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get user'
      });
    }
  }

  /**
   * @desc    Create user
   * @route   POST /api/users
   * @access  Private (Admin)
   */
  async createUser(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { 
        username, 
        email, 
        password, 
        fullName, 
        department, 
        securityClearance,
        roleId 
      } = req.body;

      // Check if user exists
      const existingUser = await User.findOne({ 
        $or: [{ email }, { username }] 
      });

      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'User already exists with this email or username'
        });
      }

      // Get role (accepts roleId ObjectId or role name string)
      const targetRole = roleId || req.body.role;
      let role;
      if (targetRole) {
        if (mongoose.Types.ObjectId.isValid(targetRole)) {
          role = await Role.findById(targetRole);
        }
        if (!role) {
          role = await Role.findOne({ name: targetRole.toString().toLowerCase() });
        }
        if (!role) {
          return res.status(404).json({
            success: false,
            message: 'Role not found'
          });
        }
      } else {
        role = await Role.findOne({ name: 'viewer' });
      }

      // Create user
      const user = new User({
        username,
        email,
        password,
        fullName,
        department,
        securityClearance: securityClearance || 'internal',
        role: role._id,
        isActive: true
      });

      await user.save();

      logger.info(`User created: ${username} by ${req.user.username}`);

      res.status(201).json({
        success: true,
        message: 'User created successfully',
        data: {
          id: user._id,
          username: user.username,
          email: user.email,
          fullName: user.fullName,
          department: user.department,
          securityClearance: user.securityClearance,
          role: role.name
        }
      });
    } catch (error) {
      logger.error('Create user error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create user'
      });
    }
  }

  /**
   * @desc    Update user
   * @route   PUT /api/users/:userId
   * @access  Private (Admin/Manager)
   */
  async updateUser(req, res) {
    try {
      const { 
        fullName, 
        department, 
        securityClearance, 
        isActive, 
        roleId,
        preferences 
      } = req.body;

      const user = await User.findById(req.params.userId);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Update fields
      if (fullName) user.fullName = fullName;
      if (department) user.department = department;
      if (securityClearance) {
        const validClearances = ['public', 'internal', 'confidential', 'restricted'];
        if (!validClearances.includes(securityClearance)) {
          return res.status(400).json({
            success: false,
            message: 'Invalid security clearance level',
            validValues: validClearances
          });
        }
        user.securityClearance = securityClearance;
      }
      if (isActive !== undefined) user.isActive = isActive;
      if (preferences) {
        user.preferences = { ...user.preferences, ...preferences };
      }

      // Update role if provided and requester is admin
      const targetRole = roleId || req.body.role;
      if (targetRole && req.user.role.name === 'admin') {
        let role;
        if (mongoose.Types.ObjectId.isValid(targetRole)) {
          role = await Role.findById(targetRole);
        }
        if (!role) {
          role = await Role.findOne({ name: targetRole.toString().toLowerCase() });
        }
        if (!role) {
          return res.status(404).json({
            success: false,
            message: 'Role not found'
          });
        }
        user.role = role._id;
      }

      await user.save();

      logger.info(`User updated: ${user.username} by ${req.user.username}`);

      res.status(200).json({
        success: true,
        message: 'User updated successfully',
        data: {
          id: user._id,
          username: user.username,
          fullName: user.fullName,
          department: user.department,
          securityClearance: user.securityClearance,
          isActive: user.isActive,
          role: user.role
        }
      });
    } catch (error) {
      logger.error('Update user error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update user'
      });
    }
  }

  /**
   * @desc    Delete user (soft delete)
   * @route   DELETE /api/users/:userId
   * @access  Private (Admin)
   */
  async deleteUser(req, res) {
    try {
      const user = await User.findById(req.params.userId);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Prevent self-deletion
      if (user._id.equals(req.user._id)) {
        return res.status(400).json({
          success: false,
          message: 'You cannot delete your own account'
        });
      }

      // Soft delete - deactivate user
      user.isActive = false;
      user.metadata = {
        ...user.metadata,
        deactivatedBy: req.user._id,
        deactivatedAt: new Date().toISOString()
      };
      
      await user.save();

      logger.info(`User deactivated: ${user.username} by ${req.user.username}`);

      res.status(200).json({
        success: true,
        message: 'User deactivated successfully'
      });
    } catch (error) {
      logger.error('Delete user error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete user'
      });
    }
  }

  /**
   * @desc    Update user role
   * @route   PATCH /api/users/:userId/role
   * @access  Private (Admin)
   */
  async updateUserRole(req, res) {
    try {
      const { roleId } = req.body;
      
      if (!roleId) {
        return res.status(400).json({
          success: false,
          message: 'Role ID is required'
        });
      }

      const user = await User.findById(req.params.userId);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      const role = await Role.findById(roleId);
      if (!role) {
        return res.status(404).json({
          success: false,
          message: 'Role not found'
        });
      }

      // Prevent removing last admin
      if (user.role.name === 'admin' && role.name !== 'admin') {
        const adminCount = await User.countDocuments({
          role: user.role,
          isActive: true
        });
        
        if (adminCount <= 1) {
          return res.status(400).json({
            success: false,
            message: 'Cannot change role of the last admin'
          });
        }
      }

      user.role = roleId;
      await user.save();

      logger.info(`User role updated: ${user.username} to ${role.name} by ${req.user.username}`);

      res.status(200).json({
        success: true,
        message: 'User role updated successfully',
        data: {
          userId: user._id,
          username: user.username,
          role: role.name
        }
      });
    } catch (error) {
      logger.error('Update user role error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update user role'
      });
    }
  }

  /**
   * @desc    Get user documents
   * @route   GET /api/users/:userId/documents
   * @access  Private (Admin/Manager)
   */
  async getUserDocuments(req, res) {
    try {
      const { userId } = req.params;
      const { page = 1, limit = 20 } = req.query;

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      const documents = await Document.find({ owner: userId })
        .select('-encryptedContent -encryptedEmbedding')
        .sort({ createdAt: -1 })
        .skip((parseInt(page) - 1) * parseInt(limit))
        .limit(parseInt(limit))
        .lean();

      const total = await Document.countDocuments({ owner: userId });

      res.status(200).json({
        success: true,
        data: {
          documents,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
          }
        }
      });
    } catch (error) {
      logger.error('Get user documents error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get user documents'
      });
    }
  }

  /**
   * @desc    Get user activity
   * @route   GET /api/users/:userId/activity
   * @access  Private (Admin)
   */
  async getUserActivity(req, res) {
    try {
      const { userId } = req.params;
      const { startDate, endDate } = req.query;

      // This would typically query audit logs
      // For now, return basic user info
      const user = await User.findById(userId)
        .select('username email lastLogin createdAt')
        .lean();

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.status(200).json({
        success: true,
        data: {
          user,
          activity: {
            lastLogin: user.lastLogin,
            accountCreated: user.createdAt,
            // Additional activity metrics would go here
          }
        }
      });
    } catch (error) {
      logger.error('Get user activity error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get user activity'
      });
    }
  }

  /**
   * @desc    Batch deactivate users
   * @route   POST /api/users/batch/deactivate
   * @access  Private (Admin)
   */
  async batchDeactivateUsers(req, res) {
    try {
      const { userIds } = req.body;

      const result = await User.updateMany(
        { _id: { $in: userIds } },
        { $set: { isActive: false } }
      );

      logger.info(`Batch deactivated ${result.modifiedCount} users by ${req.user.username}`);

      res.status(200).json({
        success: true,
        message: `Successfully deactivated ${result.modifiedCount} users`,
        modifiedCount: result.modifiedCount
      });
    } catch (error) {
      logger.error('Batch deactivate users error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to batch deactivate users'
      });
    }
  }

  /**
   * @desc    Batch update users department
   * @route   POST /api/users/batch/update-department
   * @access  Private (Admin)
   */
  async batchUpdateDepartment(req, res) {
    try {
      const { userIds, department } = req.body;

      const result = await User.updateMany(
        { _id: { $in: userIds } },
        { $set: { department } }
      );

      logger.info(`Batch updated department to ${department} for ${result.modifiedCount} users by ${req.user.username}`);

      res.status(200).json({
        success: true,
        message: `Successfully updated department for ${result.modifiedCount} users`,
        modifiedCount: result.modifiedCount
      });
    } catch (error) {
      logger.error('Batch update department error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to batch update department'
      });
    }
  }
}

module.exports = new UserController();