import React, { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
    Box,
    CircularProgress,
    Typography,
    Alert,
    Button,
    Paper
} from '@mui/material';
import {
    Lock as LockIcon,
    Security as SecurityIcon,
    Warning as WarningIcon,
    Error as ErrorIcon
} from '@mui/icons-material';
import { useAuth } from '../../hooks/useAuth';
import { authService } from '../../services/authService';

const ProtectedRoute = ({
    children,
    requiredPermissions = [],
    requiredClearance = null,
    requiredRole = null,
    redirectTo = '/login'
}) => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, isAuthenticated, isLoading, hasPermission, hasClearance, hasRole } = useAuth();

    const [checking, setChecking] = useState(true);
    const [accessDenied, setAccessDenied] = useState(false);
    const [denialReason, setDenialReason] = useState('');

    useEffect(() => {
        const checkAccess = async () => {
            setChecking(true);
            setAccessDenied(false);

            try {
                // Check authentication
                if (!isAuthenticated) {
                    setAccessDenied(true);
                    setDenialReason('Authentication required');
                    setChecking(false);
                    return;
                }

                // Check role requirement
                if (requiredRole && !hasRole(requiredRole)) {
                    setAccessDenied(true);
                    setDenialReason(`Requires ${requiredRole} role`);
                    setChecking(false);
                    return;
                }

                // Check clearance requirement
                if (requiredClearance && !hasClearance(requiredClearance)) {
                    setAccessDenied(true);
                    setDenialReason(`Requires ${requiredClearance} clearance level`);
                    setChecking(false);
                    return;
                }

                // Check permissions
                if (requiredPermissions.length > 0) {
                    const missingPermissions = requiredPermissions.filter(
                        permission => !hasPermission(permission)
                    );

                    if (missingPermissions.length > 0) {
                        setAccessDenied(true);
                        setDenialReason(`Missing permissions: ${missingPermissions.join(', ')}`);
                        setChecking(false);
                        return;
                    }
                }

                // All checks passed
                setAccessDenied(false);
                setChecking(false);

            } catch (error) {
                console.error('Access check failed:', error);
                setAccessDenied(true);
                setDenialReason('Failed to verify access');
                setChecking(false);
            }
        };

        checkAccess();
    }, [isAuthenticated, user, requiredPermissions, requiredClearance, requiredRole]);

    // Show loading spinner while checking
    if (isLoading || checking) {
        return (
            <Box sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '60vh',
                gap: 2
            }}>
                <CircularProgress size={48} />
                <Typography variant="body1" color="text.secondary">
                    Verifying access...
                </Typography>
            </Box>
        );
    }

    // Redirect to login if not authenticated
    if (!isAuthenticated) {
        return (
            <Navigate
                to={redirectTo}
                state={{ from: location.pathname }}
                replace
            />
        );
    }

    // Show access denied page
    if (accessDenied) {
        return (
            <Box sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '60vh',
                p: 3
            }}>
                <Paper
                    elevation={3}
                    sx={{
                        p: 4,
                        maxWidth: 400,
                        textAlign: 'center',
                        borderTop: 4,
                        borderColor: 'error.main'
                    }}
                >
                    <LockIcon
                        sx={{
                            fontSize: 64,
                            color: 'error.main',
                            mb: 2
                        }}
                    />

                    <Typography variant="h5" gutterBottom sx={{ fontWeight: 700 }}>
                        Access Denied
                    </Typography>

                    <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
                        You don't have permission to access this page.
                    </Typography>

                    <Alert severity="error" sx={{ mb: 2 }}>
                        {denialReason}
                    </Alert>

                    <Box sx={{
                        display: 'flex',
                        gap: 1,
                        justifyContent: 'center'
                    }}>
                        <Button
                            variant="contained"
                            onClick={() => navigate('/dashboard')}
                        >
                            Go to Dashboard
                        </Button>

                        <Button
                            variant="outlined"
                            onClick={() => navigate(-1)}
                        >
                            Go Back
                        </Button>
                    </Box>
                </Paper>
            </Box>
        );
    }

    // Render protected content
    return children;
};

export default ProtectedRoute;