import { PERMISSIONS, ROLES } from './constants';

// Permission definitions
export const PERMISSION_DEFINITIONS = {
    [PERMISSIONS.DOCUMENT.CREATE]: {
        label: 'Create Documents',
        description: 'Upload and create new documents',
        category: 'Documents',
        icon: 'create'
    },
    [PERMISSIONS.DOCUMENT.READ]: {
        label: 'Read Documents',
        description: 'View document content',
        category: 'Documents',
        icon: 'read'
    },
    [PERMISSIONS.DOCUMENT.UPDATE]: {
        label: 'Update Documents',
        description: 'Edit existing documents',
        category: 'Documents',
        icon: 'update'
    },
    [PERMISSIONS.DOCUMENT.DELETE]: {
        label: 'Delete Documents',
        description: 'Delete documents',
        category: 'Documents',
        icon: 'delete'
    },
    [PERMISSIONS.DOCUMENT.SHARE]: {
        label: 'Share Documents',
        description: 'Share documents with other users',
        category: 'Documents',
        icon: 'share'
    },
    [PERMISSIONS.DOCUMENT.DOWNLOAD]: {
        label: 'Download Documents',
        description: 'Download document files',
        category: 'Documents',
        icon: 'download'
    },
    [PERMISSIONS.DOCUMENT.EXPORT]: {
        label: 'Export Documents',
        description: 'Export document content',
        category: 'Documents',
        icon: 'export'
    },
    [PERMISSIONS.CHAT.QUERY]: {
        label: 'Chat Query',
        description: 'Send queries to the RAG system',
        category: 'Chat',
        icon: 'chat'
    },
    [PERMISSIONS.CHAT.HISTORY]: {
        label: 'Chat History',
        description: 'View conversation history',
        category: 'Chat',
        icon: 'history'
    },
    [PERMISSIONS.CHAT.FEEDBACK]: {
        label: 'Chat Feedback',
        description: 'Provide feedback on responses',
        category: 'Chat',
        icon: 'feedback'
    },
    [PERMISSIONS.USER.MANAGE]: {
        label: 'Manage Users',
        description: 'Create, update, and delete users',
        category: 'Users',
        icon: 'manage'
    },
    [PERMISSIONS.USER.READ]: {
        label: 'Read Users',
        description: 'View user information',
        category: 'Users',
        icon: 'read'
    },
    [PERMISSIONS.ROLE.MANAGE]: {
        label: 'Manage Roles',
        description: 'Create and update roles',
        category: 'Roles',
        icon: 'role'
    },
    [PERMISSIONS.AUDIT.VIEW]: {
        label: 'View Audit Logs',
        description: 'Access audit trail',
        category: 'Audit',
        icon: 'audit'
    },
    [PERMISSIONS.AUDIT.EXPORT]: {
        label: 'Export Audit Logs',
        description: 'Export audit data',
        category: 'Audit',
        icon: 'export'
    },
    [PERMISSIONS.SYSTEM.CONFIGURE]: {
        label: 'System Configuration',
        description: 'Configure system settings',
        category: 'System',
        icon: 'settings'
    }
};

// Role-based permission mappings
export const ROLE_PERMISSIONS = {
    [ROLES.ADMIN]: ['*'],
    [ROLES.MANAGER]: [
        PERMISSIONS.DOCUMENT.CREATE,
        PERMISSIONS.DOCUMENT.READ,
        PERMISSIONS.DOCUMENT.UPDATE,
        PERMISSIONS.DOCUMENT.SHARE,
        PERMISSIONS.DOCUMENT.DOWNLOAD,
        PERMISSIONS.DOCUMENT.EXPORT,
        PERMISSIONS.CHAT.QUERY,
        PERMISSIONS.CHAT.HISTORY,
        PERMISSIONS.CHAT.FEEDBACK,
        PERMISSIONS.USER.MANAGE,
        PERMISSIONS.USER.READ,
        PERMISSIONS.AUDIT.VIEW,
        PERMISSIONS.AUDIT.EXPORT
    ],
    [ROLES.ANALYST]: [
        PERMISSIONS.DOCUMENT.CREATE,
        PERMISSIONS.DOCUMENT.READ,
        PERMISSIONS.DOCUMENT.UPDATE,
        PERMISSIONS.DOCUMENT.DOWNLOAD,
        PERMISSIONS.CHAT.QUERY,
        PERMISSIONS.CHAT.HISTORY,
        PERMISSIONS.CHAT.FEEDBACK,
        PERMISSIONS.AUDIT.VIEW
    ],
    [ROLES.VIEWER]: [
        PERMISSIONS.DOCUMENT.READ,
        PERMISSIONS.CHAT.QUERY,
        PERMISSIONS.CHAT.HISTORY
    ],
    [ROLES.AUDITOR]: [
        PERMISSIONS.AUDIT.VIEW,
        PERMISSIONS.AUDIT.EXPORT,
        PERMISSIONS.DOCUMENT.READ
    ]
};

// Permission categories
export const PERMISSION_CATEGORIES = [
    'Documents',
    'Chat',
    'Users',
    'Roles',
    'Audit',
    'System'
];

// Get permissions by category
export const getPermissionsByCategory = (category) => {
    return Object.entries(PERMISSION_DEFINITIONS)
        .filter(([_, def]) => def.category === category)
        .map(([permission, def]) => ({
            value: permission,
            ...def
        }));
};

// Get all permissions
export const getAllPermissions = () => {
    return Object.entries(PERMISSION_DEFINITIONS).map(([value, def]) => ({
        value,
        ...def
    }));
};

// Get permissions for role
export const getRolePermissions = (role) => {
    return ROLE_PERMISSIONS[role] || [];
};

// Check if permission exists
export const isValidPermission = (permission) => {
    return Object.keys(PERMISSION_DEFINITIONS).includes(permission);
};

// Get permission label
export const getPermissionLabel = (permission) => {
    return PERMISSION_DEFINITIONS[permission]?.label || permission;
};

// Get permission description
export const getPermissionDescription = (permission) => {
    return PERMISSION_DEFINITIONS[permission]?.description || '';
};

// Get permission category
export const getPermissionCategory = (permission) => {
    return PERMISSION_DEFINITIONS[permission]?.category || 'Other';
};

// Check if role has permission
export const roleHasPermission = (role, permission) => {
    if (role === ROLES.ADMIN) return true;
    const rolePerms = ROLE_PERMISSIONS[role] || [];
    return rolePerms.includes(permission) || rolePerms.includes('*');
};

// Get all permissions for multiple roles
export const getCombinedRolePermissions = (roles) => {
    const combinedPermissions = new Set();

    roles.forEach(role => {
        const rolePerms = ROLE_PERMISSIONS[role] || [];
        rolePerms.forEach(permission => combinedPermissions.add(permission));
    });

    return Array.from(combinedPermissions);
};

export default {
    PERMISSION_DEFINITIONS,
    ROLE_PERMISSIONS,
    PERMISSION_CATEGORIES,
    getPermissionsByCategory,
    getAllPermissions,
    getRolePermissions,
    isValidPermission,
    getPermissionLabel,
    getPermissionDescription,
    getPermissionCategory,
    roleHasPermission,
    getCombinedRolePermissions
};