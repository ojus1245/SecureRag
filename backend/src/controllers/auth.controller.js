const User = require('../models/User');
const Role = require('../models/Role');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const config = require('../config/config');
const logger = require('../utils/logger');
const { validationResult } = require('express-validator');

class AuthController {
  constructor() {
    this.register = this.register.bind(this);
    this.login = this.login.bind(this);
    this.refreshToken = this.refreshToken.bind(this);
    this.logout = this.logout.bind(this);
    this.getCurrentUser = this.getCurrentUser.bind(this);
    this.changePassword = this.changePassword.bind(this);
    this.forgotPassword = this.forgotPassword.bind(this);
    this.resetPassword = this.resetPassword.bind(this);
    this.generateToken = this.generateToken.bind(this);
    this.generateRefreshToken = this.generateRefreshToken.bind(this);
  }

  /**
   * @desc    Register a new user
   * @route   POST /api/auth/register
   * @access  Public
   */
  async register(req, res) {
    try {
      // Validate input
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { username, email, password, fullName, department, securityClearance } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({ 
        $or: [{ email }, { username }] 
      });

      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'User already exists with this email or username'
        });
      }

      // Get default role (viewer) or auto-create if not present
      let defaultRole = await Role.findOne({ name: 'viewer' });
      if (!defaultRole) {
        if (typeof Role.getDefaultRoles === 'function') {
          const defaultRoles = Role.getDefaultRoles();
          await Role.insertMany(defaultRoles, { ordered: false }).catch(() => {});
          defaultRole = await Role.findOne({ name: 'viewer' });
        }
        if (!defaultRole) {
          defaultRole = await Role.create({
            name: 'viewer',
            description: 'Read-only access to documents and basic queries',
            permissions: ['document:read', 'chat:query', 'chat:history'],
            accessLevel: 2,
            isSystemRole: true,
            isActive: true
          });
        }
      }

      // Create new user
      const user = new User({
        username,
        email,
        password,
        fullName,
        department,
        securityClearance: securityClearance || 'internal',
        role: defaultRole._id,
        isActive: true,
        lastLogin: null
      });

      await user.save();

      // Generate tokens
      const token = this.generateToken(user);
      const refreshToken = this.generateRefreshToken(user);

      logger.info(`User registered successfully: ${username}`);

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user: {
            id: user._id,
            username: user.username,
            email: user.email,
            fullName: user.fullName,
            department: user.department,
            securityClearance: user.securityClearance,
            role: defaultRole.name
          },
          token,
          refreshToken
        }
      });
    } catch (error) {
      logger.error('Registration error:', error);
      res.status(500).json({
        success: false,
        message: 'Registration failed',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * @desc    Login user
   * @route   POST /api/auth/login
   * @access  Public
   */
  async login(req, res) {
    try {
      const { email, password } = req.body;

      // Validate input
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email and password are required'
        });
      }

      // Find user with password
      const user = await User.findOne({ email }).select('+password').populate('role');
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      // Check if user is active
      if (!user.isActive) {
        return res.status(403).json({
          success: false,
          message: 'Account is deactivated. Contact administrator.'
        });
      }

      // Verify password
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      // Update last login
      user.lastLogin = new Date();
      await user.save();

      // Generate tokens
      const token = this.generateToken(user);
      const refreshToken = this.generateRefreshToken(user);

      logger.info(`User logged in: ${user.username}`);

      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: user._id,
            username: user.username,
            email: user.email,
            fullName: user.fullName,
            department: user.department,
            securityClearance: user.securityClearance,
            role: user.role,
            permissions: user.role.permissions
          },
          token,
          refreshToken
        }
      });
    } catch (error) {
      logger.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Login failed',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * @desc    Refresh access token
   * @route   POST /api/auth/refresh-token
   * @access  Public
   */
  async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          message: 'Refresh token is required'
        });
      }

      // Verify refresh token
      const decoded = jwt.verify(refreshToken, config.jwt.secret);
      
      // Get user
      const user = await User.findById(decoded.userId).populate('role');
      
      if (!user || !user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'Invalid refresh token or user is inactive'
        });
      }

      // Check token version
      if (decoded.tokenVersion !== undefined && user.tokenVersion && decoded.tokenVersion !== user.tokenVersion) {
        return res.status(401).json({
          success: false,
          message: 'Refresh token has been revoked. Please login again.'
        });
      }

      // Generate new tokens
      const newToken = this.generateToken(user);
      const newRefreshToken = this.generateRefreshToken(user);

      res.status(200).json({
        success: true,
        message: 'Token refreshed successfully',
        data: {
          token: newToken,
          refreshToken: newRefreshToken
        }
      });
    } catch (error) {
      logger.error('Token refresh error:', error);
      res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token'
      });
    }
  }

  /**
   * @desc    Logout user
   * @route   POST /api/auth/logout
   * @access  Private
   */
  async logout(req, res) {
    try {
      // In a stateless JWT system, we can implement token blacklisting here
      // For now, just return success
      logger.info(`User logged out: ${req.user.username}`);
      
      res.status(200).json({
        success: true,
        message: 'Logout successful'
      });
    } catch (error) {
      logger.error('Logout error:', error);
      res.status(500).json({
        success: false,
        message: 'Logout failed'
      });
    }
  }

  /**
   * @desc    Get current user profile
   * @route   GET /api/auth/me
   * @access  Private
   */
  async getCurrentUser(req, res) {
    try {
      const user = await User.findById(req.user._id)
        .populate('role')
        .select('-password');

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.status(200).json({
        success: true,
        data: {
          user: {
            id: user._id,
            username: user.username,
            email: user.email,
            fullName: user.fullName,
            department: user.department,
            securityClearance: user.securityClearance,
            role: user.role,
            isActive: user.isActive,
            lastLogin: user.lastLogin,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt
          }
        }
      });
    } catch (error) {
      logger.error('Get current user error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get user information'
      });
    }
  }

  /**
   * @desc    Change password
   * @route   POST /api/auth/change-password
   * @access  Private
   */
  async changePassword(req, res) {
    try {
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          message: 'Current password and new password are required'
        });
      }

      // Validate new password strength
      if (newPassword.length < 8) {
        return res.status(400).json({
          success: false,
          message: 'New password must be at least 8 characters long'
        });
      }

      const user = await User.findById(req.user._id).select('+password');
      
      // Verify current password
      const isPasswordValid = await user.comparePassword(currentPassword);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }

      // Update password
      user.password = newPassword;
      await user.save();

      logger.info(`Password changed for user: ${user.username}`);

      res.status(200).json({
        success: true,
        message: 'Password changed successfully'
      });
    } catch (error) {
      logger.error('Change password error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to change password'
      });
    }
  }

  /**
   * @desc    Request password reset
   * @route   POST /api/auth/forgot-password
   * @access  Public
   */
  async forgotPassword(req, res) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Email is required'
        });
      }

      const user = await User.findOne({ email });
      
      // Don't reveal if user exists or not for security
      if (user) {
        // Generate password reset token
        const resetToken = jwt.sign(
          { userId: user._id, purpose: 'password-reset' },
          config.jwt.secret,
          { expiresIn: '1h' }
        );

        // In production, send email with reset link
        logger.info(`Password reset requested for: ${email}`);
        
        // TODO: Send email with reset token
      }

      res.status(200).json({
        success: true,
        message: 'If the email exists, a password reset link has been sent'
      });
    } catch (error) {
      logger.error('Forgot password error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to process password reset request'
      });
    }
  }

  /**
   * @desc    Reset password with token
   * @route   POST /api/auth/reset-password
   * @access  Public
   */
  async resetPassword(req, res) {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return res.status(400).json({
          success: false,
          message: 'Token and new password are required'
        });
      }

      // Verify token
      const decoded = jwt.verify(token, config.jwt.secret);
      
      if (decoded.purpose !== 'password-reset') {
        return res.status(400).json({
          success: false,
          message: 'Invalid reset token'
        });
      }

      const user = await User.findById(decoded.userId);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Update password
      user.password = newPassword;
      await user.save();

      logger.info(`Password reset for user: ${user.username}`);

      res.status(200).json({
        success: true,
        message: 'Password reset successfully'
      });
    } catch (error) {
      logger.error('Reset password error:', error);
      res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }
  }

  // Helper methods
  generateToken(user) {
    return jwt.sign(
      {
        userId: user._id,
        username: user.username,
        role: user.role?.name || (typeof user.role === 'string' ? user.role : 'viewer'),
        permissions: user.role?.permissions || [],
        tokenVersion: user.tokenVersion || 0,
        type: 'access'
      },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn, algorithm: 'HS256' }
    );
  }

  generateRefreshToken(user) {
    return jwt.sign(
      { 
        userId: user._id,
        tokenVersion: user.tokenVersion || 0,
        type: 'refresh'
      },
      config.jwt.secret,
      { expiresIn: config.jwt.refreshExpiresIn, algorithm: 'HS256' }
    );
  }
}

module.exports = new AuthController();
