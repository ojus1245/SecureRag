// ============================================
// Application Constants
// ============================================

// API Configuration
export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
export const API_PREFIX = '/api';
export const WS_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:5000/ws';

// API Endpoints
export const API_ENDPOINTS = {
    AUTH: {
        LOGIN: '/api/auth/login',
        REGISTER: '/api/auth/register',
        LOGOUT: '/api/auth/logout',
        REFRESH_TOKEN: '/api/auth/refresh-token',
        ME: '/api/auth/me',
        CHANGE_PASSWORD: '/api/auth/change-password',
        FORGOT_PASSWORD: '/api/auth/forgot-password',
        RESET_PASSWORD: '/api/auth/reset-password',
        VERIFY_MFA: '/api/auth/verify-mfa',
        ENABLE_MFA: '/api/auth/enable-mfa',
        DISABLE_MFA: '/api/auth/disable-mfa'
    },
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
        SAFETY_CHECK: '/api/documents/safety-check'
    },
    CHAT: {
        QUERY: '/api/chat/query',
        STREAM: '/api/chat/stream',
        CONVERSATIONS: '/api/chat/conversations',
        CONVERSATION: '/api/chat/conversations/:conversationId',
        HISTORY: '/api/chat/history/:conversationId',
        FEEDBACK: '/api/chat/feedback',
        SUGGESTIONS: '/api/chat/suggestions',
        UPLOAD: '/api/chat/upload',
        EXPORT: '/api/chat/export/:conversationId',
        SAFETY_CHECK: '/api/chat/safety-check'
    },
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
    ROLES: {
        LIST: '/api/roles',
        DETAIL: '/api/roles/:roleId',
        CREATE: '/api/roles',
        UPDATE: '/api/roles/:roleId',
        DELETE: '/api/roles/:roleId'
    },
    AUDIT: {
        LIST: '/api/audit',
        DETAIL: '/api/audit/:logId',
        STATS: '/api/audit/stats',
        SECURITY_EVENTS: '/api/audit/security-events',
        USER_TRAIL: '/api/audit/user/:userId',
        EXPORT: '/api/audit/export',
        ANALYTICS: '/api/audit/analytics',
        TRENDS: '/api/audit/analytics/trends',
        LOG: '/api/audit/log',
        SECURITY_LOG: '/api/audit/security-log',
        CLEANUP: '/api/audit/cleanup'
    }
};

// Document Classifications
export const DOCUMENT_CLASSIFICATIONS = {
    PUBLIC: 'public',
    INTERNAL: 'internal',
    CONFIDENTIAL: 'confidential',
    RESTRICTED: 'restricted'
};

export const CLASSIFICATION_LEVELS = [
    { value: 'public', label: 'Public', level: 1 },
    { value: 'internal', label: 'Internal', level: 2 },
    { value: 'confidential', label: 'Confidential', level: 3 },
    { value: 'restricted', label: 'Restricted', level: 4 }
];

export const CLASSIFICATION_COLORS = {
    public: {
        main: '#4caf50',
        light: '#e8f5e9',
        dark: '#2e7d32',
        text: '#1b5e20'
    },
    internal: {
        main: '#2196f3',
        light: '#e3f2fd',
        dark: '#1565c0',
        text: '#0d47a1'
    },
    confidential: {
        main: '#ff9800',
        light: '#fff3e0',
        dark: '#e65100',
        text: '#bf360c'
    },
    restricted: {
        main: '#f44336',
        light: '#ffebee',
        dark: '#c62828',
        text: '#b71c1c'
    }
};

// Document Status
export const DOCUMENT_STATUS = {
    DRAFT: 'draft',
    PUBLISHED: 'published',
    ARCHIVED: 'archived',
    DELETED: 'deleted'
};

// File Types
export const FILE_TYPES = ['pdf', 'docx', 'txt', 'md', 'html', 'json', 'other'];

export const ALLOWED_MIME_TYPES = {
    'application/pdf': '.pdf',
    'application/msword': '.doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
    'text/plain': '.txt',
    'text/markdown': '.md',
    'text/html': '.html',
    'application/json': '.json'
};

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Roles
export const ROLES = {
    ADMIN: 'admin',
    MANAGER: 'manager',
    ANALYST: 'analyst',
    VIEWER: 'viewer',
    AUDITOR: 'auditor'
};

// Permissions
export const PERMISSIONS = {
    DOCUMENT: {
        CREATE: 'document:create',
        READ: 'document:read',
        UPDATE: 'document:update',
        DELETE: 'document:delete',
        SHARE: 'document:share',
        DOWNLOAD: 'document:download',
        EXPORT: 'document:export'
    },
    CHAT: {
        QUERY: 'chat:query',
        HISTORY: 'chat:history',
        FEEDBACK: 'chat:feedback'
    },
    USER: {
        MANAGE: 'user:manage',
        CREATE: 'user:create',
        READ: 'user:read',
        UPDATE: 'user:update',
        DELETE: 'user:delete'
    },
    ROLE: {
        MANAGE: 'role:manage'
    },
    AUDIT: {
        VIEW: 'audit:view',
        EXPORT: 'audit:export',
        MANAGE: 'audit:manage'
    },
    SYSTEM: {
        CONFIGURE: 'system:configure',
        BACKUP: 'system:backup',
        RESTORE: 'system:restore'
    }
};

// Audit Actions
export const AUDIT_ACTIONS = {
    LOGIN: 'LOGIN',
    LOGOUT: 'LOGOUT',
    AUTHENTICATE: 'AUTHENTICATE',
    AUTH_FAILED: 'AUTH_FAILED',
    DOCUMENT_CREATE: 'DOCUMENT_CREATE',
    DOCUMENT_READ: 'DOCUMENT_READ',
    DOCUMENT_UPDATE: 'DOCUMENT_UPDATE',
    DOCUMENT_DELETE: 'DOCUMENT_DELETE',
    DOCUMENT_SHARE: 'DOCUMENT_SHARE',
    DOCUMENT_DOWNLOAD: 'DOCUMENT_DOWNLOAD',
    CHAT_QUERY: 'CHAT_QUERY',
    CHAT_RESPONSE: 'CHAT_RESPONSE',
    CHAT_FEEDBACK: 'CHAT_FEEDBACK',
    USER_CREATE: 'USER_CREATE',
    USER_UPDATE: 'USER_UPDATE',
    USER_DELETE: 'USER_DELETE',
    ROLE_UPDATE: 'ROLE_UPDATE',
    SECURITY_EVENT: 'SECURITY_EVENT'
};

// Pagination Defaults
export const DEFAULT_PAGE_SIZE = 20;
export const DEFAULT_PAGE = 1;
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

// Time Constants
export const TIME_CONSTANTS = {
    SECOND: 1000,
    MINUTE: 60 * 1000,
    HOUR: 60 * 60 * 1000,
    DAY: 24 * 60 * 60 * 1000,
    WEEK: 7 * 24 * 60 * 60 * 1000,
    MONTH: 30 * 24 * 60 * 60 * 1000,
    YEAR: 365 * 24 * 60 * 60 * 1000
};

// Storage Keys
export const STORAGE_KEYS = {
    ACCESS_TOKEN: 'accessToken',
    REFRESH_TOKEN: 'refreshToken',
    USER: 'user',
    THEME: 'theme',
    LANGUAGE: 'language',
    PREFERENCES: 'preferences'
};

// Notification Types
export const NOTIFICATION_TYPES = {
    SUCCESS: 'success',
    ERROR: 'error',
    WARNING: 'warning',
    INFO: 'info'
};

// Chat Constants
export const CHAT_CONSTANTS = {
    MAX_MESSAGE_LENGTH: 4000,
    MAX_CONVERSATION_MESSAGES: 100,
    TYPING_INDICATOR_TIMEOUT: 3000,
    STREAMING_CHUNK_SIZE: 50
};

// Validation Constants
export const VALIDATION_RULES = {
    USERNAME: {
        MIN_LENGTH: 3,
        MAX_LENGTH: 50,
        PATTERN: /^[a-zA-Z0-9_]+$/
    },
    PASSWORD: {
        MIN_LENGTH: 8,
        MAX_LENGTH: 100,
        PATTERN: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/
    },
    EMAIL: {
        PATTERN: /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/
    },
    DOCUMENT_TITLE: {
        MIN_LENGTH: 3,
        MAX_LENGTH: 200
    }
};

export default {
    API_BASE_URL,
    API_PREFIX,
    WS_URL,
    API_ENDPOINTS,
    DOCUMENT_CLASSIFICATIONS,
    CLASSIFICATION_LEVELS,
    CLASSIFICATION_COLORS,
    DOCUMENT_STATUS,
    FILE_TYPES,
    ALLOWED_MIME_TYPES,
    MAX_FILE_SIZE,
    ROLES,
    PERMISSIONS,
    AUDIT_ACTIONS,
    DEFAULT_PAGE_SIZE,
    DEFAULT_PAGE,
    PAGE_SIZE_OPTIONS,
    TIME_CONSTANTS,
    STORAGE_KEYS,
    NOTIFICATION_TYPES,
    CHAT_CONSTANTS,
    VALIDATION_RULES
};