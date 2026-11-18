import { useState, useEffect, useCallback, useRef } from 'react';
import { logger } from '../utils/logger';

export const useWebSocket = (url) => {
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [lastMessage, setLastMessage] = useState(null);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const subscribersRef = useRef(new Map());

  const connect = useCallback(() => {
    if (!url) return;

    // If already connected or connecting, don't create a new one
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      setConnectionStatus('connecting');
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        logger.info('WebSocket connected to', url);
        setConnectionStatus('connected');
        reconnectAttemptsRef.current = 0;

        // Re-subscribe any channels that were registered
        for (const channel of subscribersRef.current.keys()) {
          try {
            ws.send(JSON.stringify({ type: 'subscribe', channel }));
          } catch (e) {
            // ignore
          }
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setLastMessage(data);

          // Dispatch to subscribers if channel is specified
          if (data.channel && subscribersRef.current.has(data.channel)) {
            const cbs = subscribersRef.current.get(data.channel);
            cbs.forEach(cb => cb(data));
          } else {
            // Also notify any general subscribers
            for (const [channel, cbs] of subscribersRef.current.entries()) {
              if (data.conversationId && channel.includes(data.conversationId)) {
                cbs.forEach(cb => cb(data));
              }
            }
          }
        } catch {
          setLastMessage(event.data);
        }
      };

      ws.onclose = () => {
        logger.info('WebSocket disconnected');
        setConnectionStatus('disconnected');

        // Auto-reconnect with backoff
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            connect();
          }, delay);
        }
      };

      ws.onerror = (error) => {
        logger.error('WebSocket error:', error);
        setConnectionStatus('error');
      };
    } catch (error) {
      logger.error('WebSocket connection failed:', error);
      setConnectionStatus('error');
    }
  }, [url]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  const sendMessage = useCallback((message) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const data = typeof message === 'string' ? message : JSON.stringify(message);
      wsRef.current.send(data);
      return true;
    }
    logger.warn('WebSocket not connected, cannot send message');
    return false;
  }, []);

  const subscribe = useCallback((channel, callback) => {
    if (!subscribersRef.current.has(channel)) {
      subscribersRef.current.set(channel, new Set());
    }
    subscribersRef.current.get(channel).add(callback);

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify({ type: 'subscribe', channel }));
      } catch (e) {
        // ignore
      }
    }

    return () => {
      const cbs = subscribersRef.current.get(channel);
      if (cbs) {
        cbs.delete(callback);
        if (cbs.size === 0) {
          subscribersRef.current.delete(channel);
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            try {
              wsRef.current.send(JSON.stringify({ type: 'unsubscribe', channel }));
            } catch (e) {
              // ignore
            }
          }
        }
      }
    };
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
    }
  }, []);

  return {
    connectionStatus,
    lastMessage,
    sendMessage,
    subscribe,
    connect,
    disconnect
  };
};

export default useWebSocket;
