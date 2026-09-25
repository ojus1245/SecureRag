import { useState, useCallback } from 'react';
import { toast } from 'react-toastify';

export const useNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const addNotification = useCallback((notification) => {
    const newNotification = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      read: false,
      ...notification
    };
    setNotifications(prev => [newNotification, ...prev]);
    setUnreadCount(prev => prev + 1);

    // Also show toast
    const toastType = notification.type || 'info';
    toast[toastType]?.(notification.message || notification.title, {
      autoClose: 5000
    });

    return newNotification;
  }, []);

  const markAsRead = useCallback((notificationId) => {
    setNotifications(prev =>
      prev.map(n =>
        n.id === notificationId ? { ...n, read: true } : n
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  const removeNotification = useCallback((notificationId) => {
    setNotifications(prev => {
      const notification = prev.find(n => n.id === notificationId);
      if (notification && !notification.read) {
        setUnreadCount(c => Math.max(0, c - 1));
      }
      return prev.filter(n => n.id !== notificationId);
    });
  }, []);

  const success = useCallback((message, title = 'Success') => {
    return addNotification({ type: 'success', message, title });
  }, [addNotification]);

  const error = useCallback((message, title = 'Error') => {
    return addNotification({ type: 'error', message, title });
  }, [addNotification]);

  const warning = useCallback((message, title = 'Warning') => {
    return addNotification({ type: 'warning', message, title });
  }, [addNotification]);

  const info = useCallback((message, title = 'Info') => {
    return addNotification({ type: 'info', message, title });
  }, [addNotification]);

  return {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    removeNotification,
    success,
    error,
    warning,
    info
  };
};

export default useNotifications;
