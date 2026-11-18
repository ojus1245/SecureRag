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

export const userService = {
  getUsers: async (params = {}) => {
    const response = await api.get('/users', { params });
    return response.data;
  },

  getUserById: async (userId) => {
    const response = await api.get(`/users/${userId}`);
    return response.data;
  },

  createUser: async (userData) => {
    const response = await api.post('/users', userData);
    return response.data;
  },

  updateUser: async (userId, userData) => {
    const response = await api.put(`/users/${userId}`, userData);
    return response.data;
  },

  deleteUser: async (userId) => {
    const response = await api.delete(`/users/${userId}`);
    return response.data;
  },

  updateUserRole: async (userId, role) => {
    const response = await api.put(`/users/${userId}/role`, { role });
    return response.data;
  },

  updateUserPermissions: async (userId, permissions) => {
    const response = await api.put(`/users/${userId}/permissions`, { permissions });
    return response.data;
  },

  resetUserPassword: async (userId) => {
    const response = await api.post(`/users/${userId}/reset-password`);
    return response.data;
  },

  toggleUserStatus: async (userId, active) => {
    const response = await api.put(`/users/${userId}/status`, { active });
    return response.data;
  }
};

export default userService;
