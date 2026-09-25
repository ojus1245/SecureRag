import { useMemo, useCallback } from 'react';
import { useSelector } from 'react-redux';
import {
    selectPermissions,
    selectRole,
    selectSecurityClearance,
    selectUser
} from '../store/authSlice';

export const usePermissions = () => {
    const user = useSelector(selectUser);
    const permissions = useSelector(selectPermissions);
    const role = useSelector(selectRole);
    const securityClearance = useSelector(selectSecurityClearance);

    // Check if user has specific permission
    const hasPermission = useCallback((permission) => {
        if (role === 'admin') return true;
        if (!permissions) return false;
        return permissions.includes(permission) || permissions.includes('*');
    }, [permissions, role]);

    // Check if user has any of the given permissions
    const hasAnyPermission = useCallback((requiredPermissions) => {
        if (role === 'admin') return true;
        if (!permissions) return false;
        return requiredPermissions.some(permission =>
            permissions.includes(permission) || permissions.includes('*')
        );
    }, [permissions, role]);

    // Check if user has all of the given permissions
    const hasAllPermissions = useCallback((requiredPermissions) => {
        if (role === 'admin') return true;
        if (!permissions) return false;
        return requiredPermissions.every(permission =>
            permissions.includes(permission) || permissions.includes('*')
        );
    }, [permissions, role]);

    // Check if user has specific role
    const hasRole = useCallback((roleName) => {
        return role === roleName;
    }, [role]);

    // Check if user has any of the given roles
    const hasAnyRole = useCallback((roleNames) => {
        return roleNames.includes(role);
    }, [role]);

    // Check if user has required clearance
    const hasClearance = useCallback((requiredClearance) => {
        const levels = ['public', 'internal', 'confidential', 'restricted'];
        const userLevel = levels.indexOf(securityClearance);
        const requiredLevel = levels.indexOf(requiredClearance);
        return userLevel >= requiredLevel;
    }, [securityClearance]);

    // Check if user can access document with given classification
    const canAccessClassification = useCallback((classification) => {
        return hasClearance(classification);
    }, [hasClearance]);

    // Check if user can perform action on document
    const canPerformDocumentAction = useCallback((action, document) => {
        if (!document) return false;

        // Owner can do everything
        if (document.owner?.id === user?.id) return true;

        // Admin can do everything
        if (role === 'admin') return true;

        // Check ACL permissions
        if (document.permissions?.includes(action)) return true;

        return false;
    }, [user, role]);

    // Check if user can view document
    const canViewDocument = useCallback((document) => {
        return canPerformDocumentAction('read', document);
    }, [canPerformDocumentAction]);

    // Check if user can edit document
    const canEditDocument = useCallback((document) => {
        return canPerformDocumentAction('write', document);
    }, [canPerformDocumentAction]);

    // Check if user can delete document
    const canDeleteDocument = useCallback((document) => {
        return canPerformDocumentAction('delete', document);
    }, [canPerformDocumentAction]);

    // Check if user can share document
    const canShareDocument = useCallback((document) => {
        return canPerformDocumentAction('share', document);
    }, [canPerformDocumentAction]);

    // Check if user can download document
    const canDownloadDocument = useCallback((document) => {
        return canPerformDocumentAction('download', document);
    }, [canPerformDocumentAction]);

    // Memoized permission map
    const permissionMap = useMemo(() => {
        const map = {};
        if (permissions) {
            permissions.forEach(permission => {
                map[permission] = true;
            });
        }
        return map;
    }, [permissions]);

    return {
        user,
        role,
        permissions,
        securityClearance,
        permissionMap,
        hasPermission,
        hasAnyPermission,
        hasAllPermissions,
        hasRole,
        hasAnyRole,
        hasClearance,
        canAccessClassification,
        canPerformDocumentAction,
        canViewDocument,
        canEditDocument,
        canDeleteDocument,
        canShareDocument,
        canDownloadDocument
    };
};

export default usePermissions;