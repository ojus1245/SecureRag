import { ROLES } from './constants';
import { ROLE_PERMISSIONS } from './permissions';

// Role definitions
export const ROLE_DEFINITIONS = {
    [ROLES.ADMIN]: {
        label: 'Administrator',
        description: 'Full system access with all permissions',
        accessLevel: 5,
        icon: 'admin',
        color: 'error',
        isSystemRole: true
    },
    [ROLES.MANAGER]: {
        label: 'Manager',
        description: 'Manage documents, users, and view audit logs',
        accessLevel: 4,
        icon: 'manager',
        color: 'warning',
        isSystemRole: true
    },
    [ROLES.ANALYST]: {
        label: 'Analyst',
        description: 'Analyze documents and query the system',
        accessLevel: 3,
        icon: 'analyst',
        color: 'info',
        isSystemRole: true
    },
    [ROLES.VIEWER]: {
        label: 'Viewer',
        description: 'Read-only access to documents',
        accessLevel: 2,
        icon: 'viewer',
        color: 'success',
        isSystemRole: true
    },
    [ROLES.AUDITOR]: {
        label: 'Auditor',
        description: 'Access to audit logs and reports',
        accessLevel: 2,
        icon: 'auditor',
        color: 'secondary',
        isSystemRole: true
    }
};

// Role hierarchy
export const ROLE_HIERARCHY = {
    [ROLES.ADMIN]: 5,
    [ROLES.MANAGER]: 4,
    [ROLES.ANALYST]: 3,
    [ROLES.VIEWER]: 2,
    [ROLES.AUDITOR]: 2
};

// Get role definition
export const getRoleDefinition = (role) => {
    return ROLE_DEFINITIONS[role] || {
        label: role,
        description: 'Custom role',
        accessLevel: 1,
        icon: 'custom',
        color: 'default',
        isSystemRole: false
    };
};

// Get role label
export const getRoleLabel = (role) => {
    return ROLE_DEFINITIONS[role]?.label || role;
};

// Get role description
export const getRoleDescription = (role) => {
    return ROLE_DEFINITIONS[role]?.description || '';
};

// Get role access level
export const getRoleAccessLevel = (role) => {
    return ROLE_HIERARCHY[role] || 1;
};

// Get role color
export const getRoleColor = (role) => {
    return ROLE_DEFINITIONS[role]?.color || 'default';
};

// Check if role is system role
export const isSystemRole = (role) => {
    return ROLE_DEFINITIONS[role]?.isSystemRole || false;
};

// Get role permissions
export const getRolePermissionsList = (role) => {
    return ROLE_PERMISSIONS[role] || [];
};

// Get all roles
export const getAllRoles = () => {
    return Object.values(ROLES);
};

// Get system roles
export const getSystemRoles = () => {
    return Object.entries(ROLE_DEFINITIONS)
        .filter(([_, def]) => def.isSystemRole)
        .map(([role]) => role);
};

// Check if role exists
export const isValidRole = (role) => {
    return Object.values(ROLES).includes(role);
};

// Check if role has higher access level
export const hasHigherAccessLevel = (role1, role2) => {
    return getRoleAccessLevel(role1) > getRoleAccessLevel(role2);
};

// Check if role has equal or higher access level
export const hasEqualOrHigherAccessLevel = (role1, role2) => {
    return getRoleAccessLevel(role1) >= getRoleAccessLevel(role2);
};

// Get roles by access level
export const getRolesByAccessLevel = (level) => {
    return Object.entries(ROLE_HIERARCHY)
        .filter(([_, accessLevel]) => accessLevel >= level)
        .map(([role]) => role);
};

// Sort roles by access level
export const sortRolesByAccessLevel = (roles) => {
    return [...roles].sort((a, b) =>
        getRoleAccessLevel(b) - getRoleAccessLevel(a)
    );
};

export default {
    ROLE_DEFINITIONS,
    ROLE_HIERARCHY,
    getRoleDefinition,
    getRoleLabel,
    getRoleDescription,
    getRoleAccessLevel,
    getRoleColor,
    isSystemRole,
    getRolePermissionsList,
    getAllRoles,
    getSystemRoles,
    isValidRole,
    hasHigherAccessLevel,
    hasEqualOrHigherAccessLevel,
    getRolesByAccessLevel,
    sortRolesByAccessLevel
};