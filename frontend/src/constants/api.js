// Get API URL from environment or default to backend server
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const API_ENDPOINTS = {
  // Auth
  AUTH: {
    LOGIN: '/api/auth/login',
    REGISTER: '/api/auth/register',
    LOGOUT: '/api/auth/logout',
    REFRESH: '/api/auth/refresh-token',
    REFRESH_TOKEN: '/api/auth/refresh-token',
    ME: '/api/auth/me',
    CHANGE_PASSWORD: '/api/auth/change-password',
    FORGOT_PASSWORD: '/api/auth/forgot-password',
    RESET_PASSWORD: '/api/auth/reset-password',
    VERIFY_MFA: '/api/auth/mfa/verify',
    ENABLE_MFA: '/api/auth/mfa/enable',
    DISABLE_MFA: '/api/auth/mfa/disable'
  },

  // Chat
  CHAT: {
    CONVERSATIONS: '/api/chat/conversations',
    CONVERSATION: '/api/chat/conversations/:conversationId',
    MESSAGES: '/api/chat/messages',
    HISTORY: '/api/chat/history/:conversationId',
    QUERY: '/api/chat/query',
    STREAM: '/api/chat/stream',
    FEEDBACK: '/api/chat/feedback',
    SUGGESTIONS: '/api/chat/suggestions',
    UPLOAD: '/api/chat/upload',
    EXPORT: '/api/chat/export/:conversationId',
    SAFETY_CHECK: '/api/chat/safety-check'
  },

  // Documents
  DOCUMENTS: {
    LIST: '/api/documents',
    DETAIL: '/api/documents/:id',
    UPLOAD: '/api/documents',
    UPDATE: '/api/documents/:id',
    DELETE: '/api/documents/:id',
    BULK_DELETE: '/api/documents/batch/delete',
    SHARE: '/api/documents/:id/share',
    UPDATE_SHARE: '/api/documents/:id/share/:userId',
    REVOKE_SHARE: '/api/documents/:id/share/:userId',
    ACL: '/api/documents/:id/acl',
    DOWNLOAD: '/api/documents/:id/download',
    SEARCH: '/api/documents/search',
    STATS: '/api/documents/stats',
    VERSIONS: '/api/documents/:id/versions',
    SAFETY_CHECK: '/api/documents/safety-check',
    CATEGORIES: '/api/documents/categories'
  },

  // Users
  USERS: {
    LIST: '/api/users',
    DETAIL: '/api/users/:userId',
    CREATE: '/api/users',
    UPDATE: '/api/users/:userId',
    DELETE: '/api/users/:userId',
    ROLE: '/api/users/:userId/role',
    SEARCH: '/api/users/search',
    DOCUMENTS: '/api/users/:userId/documents',
    ACTIVITY: '/api/users/:userId/activity'
  },

  // Roles
  ROLES: {
    LIST: '/api/roles',
    DETAIL: '/api/roles/:roleId',
    CREATE: '/api/roles',
    UPDATE: '/api/roles/:roleId',
    DELETE: '/api/roles/:roleId',
    PERMISSIONS: '/api/permissions'
  },

  // Admin
  ADMIN: {
    DASHBOARD: '/api/admin/dashboard',
    USERS: '/api/users',
    ROLES: '/api/admin/roles',
    PERMISSIONS: '/api/admin/permissions',
    AUDIT: '/api/audit',
    SETTINGS: '/api/admin/settings',
    HEALTH: '/api/health'
  },

  // Settings
  SETTINGS: {
    GENERAL: '/api/settings',
    PRIVACY: '/api/settings/privacy',
    NOTIFICATIONS: '/api/settings/notifications',
    SECURITY: '/api/settings/security',
    SYSTEM: '/api/settings/system'
  },

  // Audit
  AUDIT: {
    LIST: '/api/audit',
    DETAIL: '/api/audit/:id',
    STATS: '/api/audit/stats',
    SECURITY_EVENTS: '/api/audit/security-events',
    USER_TRAIL: '/api/audit/user/:userId',
    EXPORT: '/api/audit/export',
    LOGS: '/api/audit',
    EVENTS: '/api/audit/security-events',
    DASHBOARD: '/api/audit/stats',
    ANALYTICS: '/api/audit/analytics/trends',
    TRENDS: '/api/audit/analytics/trends',
    LOG: '/api/audit/log',
    SECURITY_LOG: '/api/audit/security-log',
    CLEANUP: '/api/audit/cleanup'
  }
};

export default API_ENDPOINTS;