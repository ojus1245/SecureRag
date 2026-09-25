import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { auditService } from '../services/auditService';
import { logger } from '../utils/logger';
import { eventBus } from '../utils/eventBus';

export const useAuditLogs = (options = {}) => {
    const {
        initialFilters = {},
        initialPagination = { page: 1, limit: 50 },
        autoLoad = true,
        refreshInterval = 0,
        enableRealtime = false
    } = options;

    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [filters, setFilters] = useState(initialFilters);
    const [pagination, setPagination] = useState(initialPagination);
    const [totalLogs, setTotalLogs] = useState(0);
    const [stats, setStats] = useState(null);
    const [securityEvents, setSecurityEvents] = useState([]);
    const [exporting, setExporting] = useState(false);
    const [realtimeConnected, setRealtimeConnected] = useState(false);

    const realtimeConnectionRef = useRef(null);
    const refreshTimerRef = useRef(null);

    // Load audit logs
    const loadLogs = useCallback(async (params = {}) => {
        setLoading(true);
        setError(null);

        try {
            const mergedParams = {
                ...filters,
                ...pagination,
                ...params
            };

            const result = await auditService.getAuditLogs(mergedParams);

            setLogs(result.logs || []);
            setTotalLogs(result.total || 0);

            return result;
        } catch (error) {
            logger.error('Failed to load audit logs:', error);
            setError(error.message);
            throw error;
        } finally {
            setLoading(false);
        }
    }, [filters, pagination]);

    // Load audit statistics
    const loadStats = useCallback(async (params = {}) => {
        try {
            const result = await auditService.getAuditStats({
                ...filters,
                ...params
            });

            setStats(result);
            return result;
        } catch (error) {
            logger.error('Failed to load audit stats:', error);
            throw error;
        }
    }, [filters]);

    // Load security events
    const loadSecurityEvents = useCallback(async (params = {}) => {
        try {
            const result = await auditService.getSecurityEvents({
                ...filters,
                ...params
            });

            setSecurityEvents(result.events || []);
            return result;
        } catch (error) {
            logger.error('Failed to load security events:', error);
            throw error;
        }
    }, [filters]);

    // Export logs
    const exportLogs = useCallback(async (format = 'json', params = {}) => {
        setExporting(true);

        try {
            const result = await auditService.exportAuditLogs({
                ...filters,
                ...params
            }, format);

            return result;
        } catch (error) {
            logger.error('Failed to export logs:', error);
            setError(error.message);
            throw error;
        } finally {
            setExporting(false);
        }
    }, [filters]);

    // Log event
    const logEvent = useCallback(async (eventData) => {
        try {
            const result = await auditService.logEvent(eventData);
            return result;
        } catch (error) {
            logger.warn('Failed to log event:', error);
            return null;
        }
    }, []);

    // Log security event
    const logSecurityEvent = useCallback(async (eventData) => {
        try {
            const result = await auditService.logSecurityEvent(eventData);
            return result;
        } catch (error) {
            logger.warn('Failed to log security event:', error);
            return null;
        }
    }, []);

    // Update filters
    const updateFilters = useCallback((newFilters) => {
        setFilters(prev => ({ ...prev, ...newFilters }));
        setPagination(prev => ({ ...prev, page: 1 }));
    }, []);

    // Update pagination
    const updatePagination = useCallback((newPagination) => {
        setPagination(prev => ({ ...prev, ...newPagination }));
    }, []);

    // Clear filters
    const clearFilters = useCallback(() => {
        setFilters({});
        setPagination(initialPagination);
    }, [initialPagination]);

    // Connect to realtime audit feed
    const connectRealtime = useCallback(() => {
        if (realtimeConnectionRef.current) {
            return realtimeConnectionRef.current;
        }

        const connection = auditService.connectToAuditFeed(
            // onEvent
            (event) => {
                setLogs(prev => [event, ...prev].slice(0, 1000));
                setRealtimeConnected(true);
                eventBus.emit('audit:event', event);
            },
            // onError
            (error) => {
                logger.error('Realtime audit feed error:', error);
                setRealtimeConnected(false);
            }
        );

        realtimeConnectionRef.current = connection;
        return connection;
    }, []);

    // Disconnect from realtime feed
    const disconnectRealtime = useCallback(() => {
        if (realtimeConnectionRef.current) {
            realtimeConnectionRef.current.disconnect();
            realtimeConnectionRef.current = null;
            setRealtimeConnected(false);
        }
    }, []);

    // Subscribe to audit events
    const subscribeToEvents = useCallback((callback) => {
        return eventBus.on('audit:event', callback);
    }, []);

    // Unsubscribe from audit events
    const unsubscribeFromEvents = useCallback((callback) => {
        return eventBus.off('audit:event', callback);
    }, []);

    // Initial load
    useEffect(() => {
        if (autoLoad) {
            loadLogs();
            loadStats();
        }
    }, [autoLoad]);

    // Reload when filters or pagination change
    useEffect(() => {
        if (autoLoad) {
            loadLogs();
        }
    }, [filters, pagination, autoLoad]);

    // Auto refresh
    useEffect(() => {
        if (refreshInterval > 0) {
            refreshTimerRef.current = setInterval(() => {
                loadLogs();
                loadStats();
            }, refreshInterval);

            return () => clearInterval(refreshTimerRef.current);
        }
    }, [refreshInterval, loadLogs, loadStats]);

    // Real-time connection
    useEffect(() => {
        if (enableRealtime) {
            connectRealtime();

            return () => {
                disconnectRealtime();
            };
        }
    }, [enableRealtime, connectRealtime, disconnectRealtime]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (refreshTimerRef.current) {
                clearInterval(refreshTimerRef.current);
            }
            disconnectRealtime();
        };
    }, [disconnectRealtime]);

    // Memoized values
    const auditState = useMemo(() => ({
        logs,
        loading,
        error,
        filters,
        pagination,
        totalLogs,
        stats,
        securityEvents,
        exporting,
        realtimeConnected
    }), [
        logs,
        loading,
        error,
        filters,
        pagination,
        totalLogs,
        stats,
        securityEvents,
        exporting,
        realtimeConnected
    ]);

    return {
        ...auditState,
        loadLogs,
        loadStats,
        loadSecurityEvents,
        exportLogs,
        logEvent,
        logSecurityEvent,
        updateFilters,
        updatePagination,
        clearFilters,
        connectRealtime,
        disconnectRealtime,
        subscribeToEvents,
        unsubscribeFromEvents
    };
};

export default useAuditLogs;