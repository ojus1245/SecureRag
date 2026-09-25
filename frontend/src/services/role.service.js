import axios from 'axios';
import { authService } from './authService';
import { eventBus } from '../utils/eventBus';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL
});

api.interceptors.request.use((config) => {
  const token = authService.getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

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

export const roleService = {
  getRoles: async () => {
    const response = await api.get('/roles');
    return response.data;
  },

  getRoleById: async (roleId) => {
    const response = await api.get(`/roles/${roleId}`);
    return response.data;
  },

  createRole: async (roleData) => {
    const response = await api.post('/roles', roleData);
    return response.data;
  },

  updateRole: async (roleId, roleData) => {
    const response = await api.put(`/roles/${roleId}`, roleData);
    return response.data;
  },

  deleteRole: async (roleId) => {
    const response = await api.delete(`/roles/${roleId}`);
    return response.data;
  },

  getPermissions: async () => {
    const response = await api.get('/roles/permissions');
    return response.data;
  }
};

export default roleService;
