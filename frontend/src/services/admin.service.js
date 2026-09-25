import axios from 'axios';
import { authService } from './authService';
import { eventBus } from '../utils/eventBus';

const API_URL = import.meta.env.VITE_API_URL || '/api';

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

export const adminService = {
  // Dashboard stats
  getDashboardStats: async () => {
    const response = await api.get('/admin/dashboard');
    return response.data;
  },

  // System health
  getSystemHealth: async () => {
    const response = await api.get('/admin/health');
    return response.data;
  },

  // User management
  getUsers: async (params = {}) => {
    const response = await api.get('/admin/users', { params });
    return response.data;
  },

  // Role management
  getRoles: async () => {
    const response = await api.get('/admin/roles');
    return response.data;
  },

  createRole: async (roleData) => {
    const response = await api.post('/admin/roles', roleData);
    return response.data;
  },

  updateRole: async (roleId, roleData) => {
    const response = await api.put(`/admin/roles/${roleId}`, roleData);
    return response.data;
  },

  deleteRole: async (roleId) => {
    const response = await api.delete(`/admin/roles/${roleId}`);
    return response.data;
  },

  // System settings
  getSystemSettings: async () => {
    const response = await api.get('/admin/settings');
    return response.data;
  },

  updateSystemSettings: async (settings) => {
    const response = await api.put('/admin/settings', settings);
    return response.data;
  },

  // Audit
  getAuditLogs: async (params = {}) => {
    const response = await api.get('/admin/audit', { params });
    return response.data;
  }
};

export default adminService;
