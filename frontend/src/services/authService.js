import axios from 'axios';
import { API_BASE_URL, API_ENDPOINTS } from '../constants/api';
import { storage } from '../utils/storage';
import { logger } from '../utils/logger';
import { eventBus } from '../utils/eventBus';

class AuthService {
  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Request interceptor
    this.api.interceptors.request.use(
      (config) => {
        const token = this.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor - FIXED: Removed auto token refresh to prevent infinite loops
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        // Only clear tokens on 401, don't try to refresh
        if (error.response?.status === 401) {
          const requestUrl = error.config?.url || '';
          
          // Don't clear tokens for login/register attempts
          if (!requestUrl.includes('/login') && !requestUrl.includes('/register')) {
            this.clearTokens();
            eventBus.emit('auth:logout');
          }
        }
        
        return Promise.reject(error);
      }
    );
  }

  /**
   * Register new user
   */
  async register(userData) {
    try {
      const response = await this.api.post(API_ENDPOINTS.AUTH.REGISTER, userData);
      logger.info('User registered successfully');
      return response.data;
    } catch (error) {
      logger.error('Registration failed:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Login user
   */
  async login(email, password, rememberMe = false) {
    try {
      const response = await this.api.post(API_ENDPOINTS.AUTH.LOGIN, {
        email,
        password
      });

      const { token, refreshToken, user } = response.data.data;

      // Store tokens
      this.setTokens(token, refreshToken, rememberMe);
      this.setUser(user);

      logger.info('Login successful');
      eventBus.emit('auth:login', user);

      return response.data.data;
    } catch (error) {
      logger.error('Login failed:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Logout user
   */
  async logout() {
    try {
      await this.api.post(API_ENDPOINTS.AUTH.LOGOUT);
    } catch (error) {
      logger.warn('Logout API call failed:', error);
    } finally {
      this.clearTokens();
      this.clearUser();
      eventBus.emit('auth:logout');
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken) {
    try {
      const response = await this.api.post(API_ENDPOINTS.AUTH.REFRESH_TOKEN, {
        refreshToken
      });

      return response.data.data;
    } catch (error) {
      logger.error('Token refresh failed:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get current user
   */
  async getCurrentUser() {
    try {
      const response = await this.api.get(API_ENDPOINTS.AUTH.ME);
      
      // Handle different response structures
      const user = response.data.data?.user || response.data.data || response.data;
      
      if (user) {
        this.setUser(user);
      }
      
      return user;
    } catch (error) {
      logger.error('Failed to get current user:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Change password
   */
  async changePassword(currentPassword, newPassword) {
    try {
      const response = await this.api.post(API_ENDPOINTS.AUTH.CHANGE_PASSWORD, {
        currentPassword,
        newPassword
      });
      logger.info('Password changed successfully');
      return response.data;
    } catch (error) {
      logger.error('Password change failed:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Forgot password
   */
  async forgotPassword(email) {
    try {
      const response = await this.api.post(API_ENDPOINTS.AUTH.FORGOT_PASSWORD, {
        email
      });
      return response.data;
    } catch (error) {
      logger.error('Forgot password request failed:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Reset password
   */
  async resetPassword(token, newPassword) {
    try {
      const response = await this.api.post(API_ENDPOINTS.AUTH.RESET_PASSWORD, {
        token,
        newPassword
      });
      logger.info('Password reset successfully');
      return response.data;
    } catch (error) {
      logger.error('Password reset failed:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Verify MFA code
   */
  async verifyMfa(code) {
    try {
      const response = await this.api.post(API_ENDPOINTS.AUTH.VERIFY_MFA, {
        code
      });
      const { token, refreshToken, user } = response.data.data;
      this.setTokens(token, refreshToken);
      this.setUser(user);
      return response.data.data;
    } catch (error) {
      logger.error('MFA verification failed:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Enable MFA
   */
  async enableMfa() {
    try {
      const response = await this.api.post(API_ENDPOINTS.AUTH.ENABLE_MFA);
      return response.data.data;
    } catch (error) {
      logger.error('Enable MFA failed:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Disable MFA
   */
  async disableMfa(code) {
    try {
      const response = await this.api.post(API_ENDPOINTS.AUTH.DISABLE_MFA, {
        code
      });
      return response.data;
    } catch (error) {
      logger.error('Disable MFA failed:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    return !!this.getToken();
  }

  /**
   * Get access token - FIXED: Use both localStorage and sessionStorage
   */
  getToken() {
    return localStorage.getItem('token') || localStorage.getItem('accessToken') || sessionStorage.getItem('token') || sessionStorage.getItem('accessToken');
  }

  /**
   * Get refresh token - FIXED
   */
  getRefreshToken() {
    return localStorage.getItem('refreshToken') || sessionStorage.getItem('refreshToken');
  }

  /**
   * Set tokens - FIXED: Store in localStorage for now
   */
  setTokens(accessToken, refreshToken, rememberMe = false) {
    // Always use localStorage for consistency
    localStorage.setItem('token', accessToken);
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    
    // Also store in sessionStorage as backup
    sessionStorage.setItem('token', accessToken);
    sessionStorage.setItem('accessToken', accessToken);
    sessionStorage.setItem('refreshToken', refreshToken);
  }

  /**
   * Clear tokens - FIXED: Clear both storages
   */
  clearTokens() {
    localStorage.removeItem('token');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('accessToken');
    sessionStorage.removeItem('refreshToken');
  }

  /**
   * Get user from storage - FIXED
   */
  getUser() {
    const userStr = localStorage.getItem('user') || sessionStorage.getItem('user');
    
    if (!userStr) return null;
    
    try {
      return JSON.parse(userStr);
    } catch (error) {
      logger.error('Failed to parse user from storage:', error);
      return null;
    }
  }

  /**
   * Set user in storage - FIXED
   */
  setUser(user) {
    if (user) {
      const userStr = JSON.stringify(user);
      localStorage.setItem('user', userStr);
      sessionStorage.setItem('user', userStr);
    }
  }

  /**
   * Clear user from storage - FIXED
   */
  clearUser() {
    localStorage.removeItem('user');
    sessionStorage.removeItem('user');
  }

  /**
   * Check if user has permission
   */
  hasPermission(permission) {
    const user = this.getUser();
    if (!user) return false;

    // Admin has all permissions
    if (user.role?.name === 'admin') return true;

    return user.role?.permissions?.includes(permission) ||
      user.role?.permissions?.includes('*');
  }

  /**
   * Check if user has role
   */
  hasRole(roleName) {
    const user = this.getUser();
    return user?.role?.name === roleName;
  }

  /**
   * Check if user has clearance
   */
  hasClearance(requiredClearance) {
    const user = this.getUser();
    if (!user) return false;

    const clearanceLevels = ['public', 'internal', 'confidential', 'restricted'];
    const userLevel = clearanceLevels.indexOf(user.securityClearance);
    const requiredLevel = clearanceLevels.indexOf(requiredClearance);

    return userLevel >= requiredLevel;
  }

  /**
   * Handle API errors - FIXED
   */
  handleError(error) {
    if (error.response) {
      const { status, data } = error.response;

      switch (status) {
        case 400: {
          // Handle validation errors
          if (data.errors && Array.isArray(data.errors)) {
            const messages = data.errors.map(e => e.message || e.msg).filter(Boolean);
            const err = new Error(messages.join('. ') || 'Validation failed');
            err.errors = data.errors;
            return err;
          }
          return new Error(data.message || 'Invalid request');
        }
        case 401:
          return new Error(data.message || 'Authentication required');
        case 403:
          return new Error(data.message || 'Access denied');
        case 404:
          return new Error(data.message || 'Resource not found');
        case 409:
          return new Error(data.message || 'Conflict occurred');
        case 429:
          return new Error(data.message || 'Too many requests. Please try again later.');
        case 500:
          return new Error(data.message || data.error || 'Server error. Please try again.');
        default:
          return new Error(data.message || 'An error occurred');
      }
    } else if (error.request) {
      return new Error('Network error. Cannot connect to server. Please check if backend is running.');
    } else {
      return new Error(error.message || 'An error occurred');
    }
  }
}

export const authService = new AuthService();
export default authService;