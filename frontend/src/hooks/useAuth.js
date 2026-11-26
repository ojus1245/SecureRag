import { useState, useEffect, useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
    loginUser,
    logoutUser,
    registerUser,
    changePassword,
    verifyMfa,
    updateUserProfile,
    updatePreferences,
    enableMfa,
    disableMfa,
    selectUser,
    selectIsAuthenticated,
    selectIsLoading,
    selectError,
    selectPermissions,
    selectSecurityClearance,
    selectRole,
    selectPreferences,
    selectMfaRequired,
    clearAuth,
    clearError
} from '../store/authSlice';
import { resetChat, clearMessages } from '../store/chatSlice';
import { authService } from '../services/authService';
import { logger } from '../utils/logger';

export const useAuth = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const user = useSelector(selectUser);
    const isAuthenticated = useSelector(selectIsAuthenticated);
    const isLoading = useSelector(selectIsLoading);
    const error = useSelector(selectError);
    const permissions = useSelector(selectPermissions);
    const securityClearance = useSelector(selectSecurityClearance);
    const role = useSelector(selectRole);
    const preferences = useSelector(selectPreferences);
    const mfaRequired = useSelector(selectMfaRequired);

    const [sessionChecked, setSessionChecked] = useState(false);

    // FIXED: Don't automatically check session on mount
    // This was causing the 401 error loop
    useEffect(() => {
        // Check if token exists and is valid
        const token = authService.getToken();
        
        if (!token) {
            setSessionChecked(true);
            return;
        }
        
        // Check if token is expired
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const isExpired = payload.exp * 1000 < Date.now();
            
            if (isExpired) {
                // Token is expired, clear everything
                authService.clearTokens();
                authService.clearUser();
                dispatch(clearAuth());
            }
        } catch (error) {
            // Invalid token format, clear it
            authService.clearTokens();
            authService.clearUser();
            dispatch(clearAuth());
        }
        
        setSessionChecked(true);
    }, [dispatch]);

    // FIXED: Removed auto token refresh interval
    // This was causing issues with refresh token loops
    useEffect(() => {
        // Only set up refresh if we have a valid session
        if (!isAuthenticated || !authService.getRefreshToken()) return;

        const refreshInterval = setInterval(async () => {
            try {
                const refreshTokenValue = authService.getRefreshToken();
                if (refreshTokenValue) {
                    const result = await authService.refreshToken(refreshTokenValue);
                    authService.setTokens(result.token, result.refreshToken);
                }
            } catch (error) {
                logger.error('Token refresh failed:', error);
                // Clear session on refresh failure
                authService.clearTokens();
                authService.clearUser();
                dispatch(clearAuth());
                navigate('/login');
            }
        }, 55 * 60 * 1000); // Refresh every 55 minutes

        return () => clearInterval(refreshInterval);
    }, [isAuthenticated, dispatch, navigate]);

    // Login handler
    const handleLogin = useCallback(async (email, password, rememberMe = false) => {
        try {
            const result = await dispatch(loginUser({ email, password, rememberMe })).unwrap();

            if (result.mfaRequired) {
                return { mfaRequired: true };
            }

            return result;
        } catch (error) {
            logger.error('Login failed:', error);
            throw error;
        }
    }, [dispatch]);

    // Register handler
    const handleRegister = useCallback(async (userData) => {
        try {
            const result = await dispatch(registerUser(userData)).unwrap();
            return result;
        } catch (error) {
            logger.error('Registration failed:', error);
            throw error;
        }
    }, [dispatch]);

    // Logout handler - FIXED
    const handleLogout = useCallback(async () => {
        try {
            await dispatch(logoutUser()).unwrap();
        } catch (error) {
            logger.warn('Logout API call failed:', error);
        } finally {
            // Always clear local storage and active session state
            authService.clearTokens();
            authService.clearUser();
            dispatch(clearAuth());
            dispatch(resetChat());
            navigate('/login');
        }
    }, [dispatch, navigate]);

    // Change password handler
    const handleChangePassword = useCallback(async (currentPassword, newPassword) => {
        try {
            const result = await dispatch(changePassword({ currentPassword, newPassword })).unwrap();
            return result;
        } catch (error) {
            logger.error('Password change failed:', error);
            throw error;
        }
    }, [dispatch]);

    // Verify MFA handler
    const handleVerifyMfa = useCallback(async (code) => {
        try {
            const result = await dispatch(verifyMfa(code)).unwrap();
            return result;
        } catch (error) {
            logger.error('MFA verification failed:', error);
            throw error;
        }
    }, [dispatch]);

    // Update profile handler
    const handleUpdateProfile = useCallback(async (profileData) => {
        try {
            const result = await dispatch(updateUserProfile(profileData)).unwrap();
            return result;
        } catch (error) {
            logger.error('Profile update failed:', error);
            throw error;
        }
    }, [dispatch]);

    // Update preferences handler
    const handleUpdatePreferences = useCallback(async (newPreferences) => {
        try {
            const result = await dispatch(updatePreferences(newPreferences)).unwrap();
            return result;
        } catch (error) {
            logger.error('Preferences update failed:', error);
            throw error;
        }
    }, [dispatch]);

    // Enable MFA handler
    const handleEnableMfa = useCallback(async () => {
        try {
            const result = await dispatch(enableMfa()).unwrap();
            return result;
        } catch (error) {
            logger.error('Enable MFA failed:', error);
            throw error;
        }
    }, [dispatch]);

    // Disable MFA handler
    const handleDisableMfa = useCallback(async (code) => {
        try {
            const result = await dispatch(disableMfa(code)).unwrap();
            return result;
        } catch (error) {
            logger.error('Disable MFA failed:', error);
            throw error;
        }
    }, [dispatch]);

    // Clear error handler
    const handleClearError = useCallback(() => {
        dispatch(clearError());
    }, [dispatch]);

    // Permission check - FIXED: Added null check
    const hasPermission = useCallback((permission) => {
        if (role === 'admin') return true;
        if (!permissions) return false;
        return permissions.includes(permission) || permissions.includes('*');
    }, [permissions, role]);

    // Role check
    const hasRole = useCallback((roleName) => {
        return role === roleName;
    }, [role]);

    // Clearance check - FIXED: Added null check
    const hasClearance = useCallback((requiredClearance) => {
        if (!securityClearance) return false;
        const levels = ['public', 'internal', 'confidential', 'restricted'];
        const userLevel = levels.indexOf(securityClearance);
        const requiredLevel = levels.indexOf(requiredClearance);
        return userLevel >= requiredLevel;
    }, [securityClearance]);

    // Memoized values
    const authState = useMemo(() => ({
        user,
        isAuthenticated,
        isLoading,
        error,
        permissions,
        securityClearance,
        role,
        preferences,
        mfaRequired,
        sessionChecked
    }), [
        user,
        isAuthenticated,
        isLoading,
        error,
        permissions,
        securityClearance,
        role,
        preferences,
        mfaRequired,
        sessionChecked
    ]);

    return {
        ...authState,
        login: handleLogin,
        logout: handleLogout,
        register: handleRegister,
        changePassword: handleChangePassword,
        verifyMfa: handleVerifyMfa,
        updateProfile: handleUpdateProfile,
        updatePreferences: handleUpdatePreferences,
        enableMfa: handleEnableMfa,
        disableMfa: handleDisableMfa,
        hasPermission,
        hasRole,
        hasClearance,
        clearError: handleClearError
    };
};

export default useAuth;
