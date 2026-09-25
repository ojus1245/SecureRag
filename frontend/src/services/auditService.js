import axios from 'axios';
import { API_BASE_URL, API_ENDPOINTS } from '../constants/api';
import { authService } from './authService';
import { logger } from '../utils/logger';
import { eventBus } from '../utils/eventBus';

class AuditService {
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
                const token = authService.getToken();
                if (token) {
                    config.headers.Authorization = `Bearer ${token}`;
                }
                return config;
            },
            (error) => Promise.reject(error)
        );

        // Response interceptor
        this.api.interceptors.response.use(
            (response) => response,
            (error) => {
                if (error.response?.status === 401) {
                    authService.clearTokens();
                    eventBus.emit('auth:logout');
                }
                return Promise.reject(error);
            }
        );
    }

    /**
     * Get audit logs with filters
     */
    async getAuditLogs(params = {}) {
        try {
            const response = await this.api.get(API_ENDPOINTS.AUDIT.LIST, { params });
            return response.data.data;
        } catch (error) {
            logger.error('Failed to get audit logs:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Get audit log by ID
     */
    async getAuditLog(logId) {
        try {
            const response = await this.api.get(
                API_ENDPOINTS.AUDIT.DETAIL.replace(':id', logId)
            );
            return response.data.data;
        } catch (error) {
            logger.error('Failed to get audit log:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Get audit statistics
     */
    async getAuditStats(filters = {}) {
        try {
            const response = await this.api.get(API_ENDPOINTS.AUDIT.STATS, {
                params: filters
            });
            return response.data.data;
        } catch (error) {
            logger.error('Failed to get audit stats:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Get security events
     */
    async getSecurityEvents(params = {}) {
        try {
            const response = await this.api.get(API_ENDPOINTS.AUDIT.SECURITY_EVENTS, {
                params
            });
            return response.data.data;
        } catch (error) {
            logger.error('Failed to get security events:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Get user audit trail
     */
    async getUserAuditTrail(userId, params = {}) {
        try {
            const response = await this.api.get(
                API_ENDPOINTS.AUDIT.USER_TRAIL.replace(':userId', userId),
                { params }
            );
            return response.data.data;
        } catch (error) {
            logger.error('Failed to get user audit trail:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Export audit logs
     */
    async exportAuditLogs(params = {}, format = 'json') {
        try {
            const response = await this.api.get(API_ENDPOINTS.AUDIT.EXPORT, {
                params: { ...params, format },
                responseType: format === 'csv' ? 'text' : 'json'
            });
            return response.data;
        } catch (error) {
            logger.error('Failed to export audit logs:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Log audit event
     */
    async logEvent(eventData) {
        try {
            logger.debug('Audit event:', eventData);
            return { success: true };
        } catch (error) {
            // Don't throw for audit logging failures
            logger.warn('Failed to log audit event:', error);
            return null;
        }
    }

    /**
     * Log security event
     */
    async logSecurityEvent(eventData) {
        try {
            logger.debug('Security event:', eventData);
            return { success: true };
        } catch (error) {
            logger.warn('Failed to log security event:', error);
            return null;
        }
    }

    /**
     * Get audit analytics
     */
    async getAuditAnalytics(params = {}) {
        try {
            const response = await this.api.get(API_ENDPOINTS.AUDIT.ANALYTICS, {
                params
            });
            return response.data.data;
        } catch (error) {
            logger.error('Failed to get audit analytics:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Get trend analytics
     */
    async getTrendAnalytics(params = {}) {
        try {
            const response = await this.api.get(API_ENDPOINTS.AUDIT.TRENDS, {
                params
            });
            return response.data.data;
        } catch (error) {
            logger.error('Failed to get trend analytics:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Cleanup old audit logs
     */
    async cleanupAuditLogs(retentionDays = 365) {
        try {
            const response = await this.api.delete(API_ENDPOINTS.AUDIT.CLEANUP, {
                data: { retentionDays }
            });
            logger.info(`Audit logs cleaned up: ${response.data.deletedCount} deleted`);
            return response.data;
        } catch (error) {
            logger.error('Failed to cleanup audit logs:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Subscribe to audit events (WebSocket)
     */
    subscribeToAuditEvents(callback) {
        return eventBus.on('audit:event', callback);
    }

    /**
     * Unsubscribe from audit events
     */
    unsubscribeFromAuditEvents(callback) {
        return eventBus.off('audit:event', callback);
    }

    /**
     * Handle API errors
     */
    handleError(error) {
        if (error.response) {
            const { status, data } = error.response;

            switch (status) {
                case 400:
                    return new Error(data.message || 'Invalid request');
                case 401:
                    return new Error('Session expired. Please login again.');
                case 403:
                    return new Error(data.message || 'Access denied');
                case 404:
                    return new Error(data.message || 'Audit log not found');
                case 429:
                    return new Error('Rate limit exceeded. Please try again later.');
                case 500:
                    return new Error(data.message || 'Server error');
                default:
                    return new Error(data.message || 'An error occurred');
            }
        } else if (error.request) {
            return new Error('Network error. Please check your connection.');
        } else {
            return new Error(error.message || 'An error occurred');
        }
    }
}

export const auditService = new AuditService();
export default auditService;