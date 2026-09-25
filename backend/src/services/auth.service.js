const User = require('../models/User');
const Role = require('../models/Role');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const config = require('../config/config');
const logger = require('../utils/logger');
const { logAuditEvent, logSecurityEvent } = require('../middleware/auditLogger');

class AuthService {
  /**
   * Create a new user
   */
  async createUser(userData) {
    try {
      const { username, email, password, fullName, department, securityClearance } = userData;

      // Check if user exists
      const existingUser = await User.findOne({ 
        $or: [{ email }, { username }] 
      });

      if (existingUser) {
        throw new Error('User already exists with this email or username');
      }

      // Get default role
      const defaultRole = await Role.findOne({ name: 'viewer' });
      if (!defaultRole) {
        throw new Error('Default role not found');
      }

      // Create user
      const user = new User({
        username,
        email,
        password,
        fullName,
        department,
        securityClearance: securityClearance || 'internal',
        role: defaultRole._id,
        isActive: true,
        preferences: {
          theme: 'light',
          language: 'en',
          notifications: true
        }
      });

      await user.save();

      logger.info(`User created: ${username}`);
      return user;
    } catch (error) {
      logger.error('Create user service error:', error);
      throw error;
    }
  }

  /**
   * Authenticate user with email and password
   */
  async authenticateUser(email, password) {
    try {
      // Find user with password
      const user = await User.findOne({ email })
        .select('+password')
        .populate('role');

      if (!user) {
        throw new Error('Invalid credentials');
      }

      // Check if user is active
      if (!user.isActive) {
        throw new Error('Account is deactivated');
      }

      // Verify password
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        // Log failed login attempt
        await logSecurityEvent({
          userId: user._id,
          username: user.username,
          severity: 'medium',
          eventType: 'FAILED_LOGIN_ATTEMPT',
          details: {
            email,
            timestamp: new Date().toISOString()
          }
        });
        throw new Error('Invalid credentials');
      }

      // Update last login
      user.lastLogin = new Date();
      await user.save();

      return user;
    } catch (error) {
      logger.error('Authenticate user service error:', error);
      throw error;
    }
  }

  /**
   * Generate JWT tokens
   */
  async generateTokens(user) {
    try {
      const token = this.generateAccessToken(user);
      const refreshToken = this.generateRefreshToken(user);

      return { token, refreshToken };
    } catch (error) {
      logger.error('Generate tokens error:', error);
      throw error;
    }
  }

  /**
   * Generate access token
   */
  generateAccessToken(user) {
    return jwt.sign(
      {
        userId: user._id,
        username: user.username,
        role: user.role?.name || 'viewer',
        permissions: user.role?.permissions || [],
        tokenVersion: user.tokenVersion || 0,
        type: 'access'
      },
      config.jwt.secret,
      { 
        expiresIn: config.jwt.expiresIn,
        algorithm: 'HS256'
      }
    );
  }

  /**
   * Generate refresh token
   */
  generateRefreshToken(user) {
    return jwt.sign(
      {
        userId: user._id,
        tokenVersion: user.tokenVersion || 0,
        type: 'refresh'
      },
      config.jwt.secret,
      { 
        expiresIn: config.jwt.refreshExpiresIn,
        algorithm: 'HS256'
      }
    );
  }

  /**
   * Verify token
   */
  async verifyToken(token, type = 'access') {
    try {
      const decoded = jwt.verify(token, config.jwt.secret, {
        algorithms: ['HS256']
      });

      // Check token type
      if (type && decoded.type !== type) {
        throw new Error('Invalid token type');
      }

      return decoded;
    } catch (error) {
      logger.error('Verify token error:', error);
      throw error;
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken) {
    try {
      // Verify refresh token
      const decoded = await this.verifyToken(refreshToken, 'refresh');

      // Get user
      const user = await User.findById(decoded.userId).populate('role');
      
      if (!user || !user.isActive) {
        throw new Error('User not found or inactive');
      }

      // Check token version
      if (decoded.tokenVersion !== (user.tokenVersion || 0)) {
        throw new Error('Token has been revoked');
      }

      // Generate new tokens
      return await this.generateTokens(user);
    } catch (error) {
      logger.error('Refresh token error:', error);
      throw error;
    }
  }

  /**
   * Revoke user tokens
   */
  async revokeUserTokens(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Increment token version to invalidate all existing tokens
      user.tokenVersion = (user.tokenVersion || 0) + 1;
      await user.save();

      logger.info(`Tokens revoked for user: ${user.username}`);
      return true;
    } catch (error) {
      logger.error('Revoke tokens error:', error);
      throw error;
    }
  }

  /**
   * Change user password
   */
  async changePassword(userId, currentPassword, newPassword) {
    try {
      const user = await User.findById(userId).select('+password');
      
      if (!user) {
        throw new Error('User not found');
      }

      // Verify current password
      const isPasswordValid = await user.comparePassword(currentPassword);
      if (!isPasswordValid) {
        throw new Error('Current password is incorrect');
      }

      // Update password
      user.password = newPassword;
      user.passwordChangedAt = new Date();
      
      // Increment token version to invalidate existing tokens
      user.tokenVersion = (user.tokenVersion || 0) + 1;
      
      await user.save();

      logger.info(`Password changed for user: ${user.username}`);
      return true;
    } catch (error) {
      logger.error('Change password error:', error);
      throw error;
    }
  }

  /**
   * Reset password using reset token
   */
  async resetPassword(resetToken, newPassword) {
    try {
      // Verify reset token
      const decoded = await this.verifyToken(resetToken, 'reset');
      
      const user = await User.findById(decoded.userId);
      
      if (!user) {
        throw new Error('User not found');
      }

      // Update password
      user.password = newPassword;
      user.passwordChangedAt = new Date();
      user.tokenVersion = (user.tokenVersion || 0) + 1;
      
      await user.save();

      logger.info(`Password reset for user: ${user.username}`);
      return true;
    } catch (error) {
      logger.error('Reset password error:', error);
      throw error;
    }
  }

  /**
   * Generate password reset token
   */
  async generatePasswordResetToken(email) {
    try {
      const user = await User.findOne({ email });
      
      if (!user) {
        // Return null to not reveal if user exists
        return null;
      }

      const resetToken = jwt.sign(
        {
          userId: user._id,
          type: 'reset',
          purpose: 'password-reset'
        },
        config.jwt.secret,
        { expiresIn: '1h' }
      );

      return resetToken;
    } catch (error) {
      logger.error('Generate reset token error:', error);
      throw error;
    }
  }

  /**
   * Validate user permissions
   */
  async validatePermissions(userId, requiredPermissions) {
    try {
      const user = await User.findById(userId).populate('role');
      
      if (!user) {
        return false;
      }

      // Admin has all permissions
      if (user.role.name === 'admin') {
        return true;
      }

      const userPermissions = user.role.permissions || [];

      return requiredPermissions.some(permission => {
        // Check direct permission
        if (userPermissions.includes(permission)) {
          return true;
        }

        // Check wildcard permission
        const [resource] = permission.split(':');
        return userPermissions.includes(`${resource}:*`);
      });
    } catch (error) {
      logger.error('Validate permissions error:', error);
      throw error;
    }
  }

  /**
   * Get user roles
   */
  async getUserRoles() {
    try {
      return await Role.find({ isActive: true });
    } catch (error) {
      logger.error('Get user roles error:', error);
      throw error;
    }
  }

  /**
   * Assign role to user
   */
  async assignRole(userId, roleId, assignedBy) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const role = await Role.findById(roleId);
      if (!role) {
        throw new Error('Role not found');
      }

      user.role = roleId;
      await user.save();

      // Log role change
      await logAuditEvent({
        userId: assignedBy,
        username: (await User.findById(assignedBy))?.username,
        action: 'ROLE_UPDATE',
        resourceType: 'user',
        resourceId: userId,
        details: {
          newRole: role.name,
          timestamp: new Date().toISOString()
        },
        status: 'success'
      });

      return user;
    } catch (error) {
      logger.error('Assign role error:', error);
      throw error;
    }
  }

  /**
   * Check security clearance
   */
  async checkSecurityClearance(userId, requiredClearance) {
    try {
      const user = await User.findById(userId);
      
      if (!user) {
        return false;
      }

      const clearanceLevels = ['public', 'internal', 'confidential', 'restricted'];
      const userClearanceIndex = clearanceLevels.indexOf(user.securityClearance);
      const requiredClearanceIndex = clearanceLevels.indexOf(requiredClearance);

      return userClearanceIndex >= requiredClearanceIndex;
    } catch (error) {
      logger.error('Check clearance error:', error);
      throw error;
    }
  }

  /**
   * Track failed login attempts
   */
  async trackFailedLogin(userId, ipAddress) {
    try {
      await logSecurityEvent({
        userId,
        severity: 'medium',
        eventType: 'FAILED_LOGIN',
        details: {
          ipAddress,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Track failed login error:', error);
      throw error;
    }
  }
}

module.exports = new AuthService();