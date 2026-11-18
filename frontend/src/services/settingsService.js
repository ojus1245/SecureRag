import axios from 'axios';
import { authService } from './authService';
import { eventBus } from '../utils/eventBus';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const API_URL = `${API_BASE}/api`;

const api = axios.create({
  baseURL: API_URL
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = authService.getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 unauthorized
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      authService.clearTokens();
      eventBus.emit('auth:logout');
    }
    return Promise.reject(error);
  }
);

export const settingsService = {
  getSettings: async () => {
    const response = await api.get('/settings');
    return response.data;
  },

  updateSettings: async (settings) => {
    const response = await api.put('/settings', settings);
    return response.data;
  },

  getPrivacySettings: async () => {
    const response = await api.get('/settings/privacy');
    return response.data;
  },

  updatePrivacySettings: async (privacySettings) => {
    const response = await api.put('/settings/privacy', privacySettings);
    return response.data;
  },

  getNotificationSettings: async () => {
    const response = await api.get('/settings/notifications');
    return response.data;
  },

  updateNotificationSettings: async (notificationSettings) => {
    const response = await api.put('/settings/notifications', notificationSettings);
    return response.data;
  },

  getSecuritySettings: async () => {
    const response = await api.get('/settings/security');
    return response.data;
  },

  updateSecuritySettings: async (securitySettings) => {
    const response = await api.put('/settings/security', securitySettings);
    return response.data;
  },

  getSystemInfo: async () => {
    const response = await api.get('/settings/system');
    return response.data;
  }
};

export default settingsService;
