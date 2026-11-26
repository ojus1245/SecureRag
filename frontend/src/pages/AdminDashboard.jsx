import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    Box,
    Paper,
    Typography,
    Grid,
    Card,
    CardContent,
    CardHeader,
    Avatar,
    IconButton,
    Tooltip,
    Chip,
    Tabs,
    Tab,
    Button,
    Alert,
    CircularProgress,
    LinearProgress,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    ListItemAvatar,
    Divider,
    Badge
} from '@mui/material';
import {
    People as PeopleIcon,
    Security as SecurityIcon,
    Assessment as AssessmentIcon,
    Settings as SettingsIcon,
    Storage as StorageIcon,
    Description as DescriptionIcon,
    Chat as ChatIcon,
    AdminPanelSettings as AdminIcon,
    TrendingUp as TrendingUpIcon,
    TrendingDown as TrendingDownIcon,
    Warning as WarningIcon,
    CheckCircle as CheckCircleIcon,
    Refresh as RefreshIcon,
    Add as AddIcon
} from '@mui/icons-material';
import AuditDashboard from '../components/admin/AuditDashboard';
import UserManagement from '../components/admin/UserManagement';
import RoleManagement from '../components/admin/RoleManagement';
import Settings from './Settings';
import { adminService } from '../services/adminService';
import { useAuth } from '../hooks/useAuth';
import { formatNumber } from '../utils/helpers';

const AdminDashboard = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, hasPermission } = useAuth();

    const [activeTab, setActiveTab] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [stats, setStats] = useState(null);
    const [refreshKey, setRefreshKey] = useState(0);

    // Sync tab with URL route if directly accessed via /admin/users, /admin/roles, /admin/settings, /admin/audit
    useEffect(() => {
        const path = location.pathname;
        if (path === '/admin/users') {
            setActiveTab(2);
        } else if (path === '/admin/roles') {
            setActiveTab(3);
        } else if (path === '/admin/audit') {
            setActiveTab(1);
        } else if (path === '/admin/settings') {
            setActiveTab(4);
        } else if (path === '/admin') {
            setActiveTab(0);
        }
    }, [location.pathname]);

    useEffect(() => {
        fetchStats();
    }, [refreshKey]);

    const fetchStats = async () => {
        setLoading(true);
        setError(null);

        try {
            const result = await adminService.getDashboardStats();
            setStats(result);
        } catch (error) {
            console.error('Failed to fetch stats:', error);
            setError('Failed to load dashboard statistics');
        } finally {
            setLoading(false);
        }
    };

    const handleTabChange = (event, newValue) => {
        setActiveTab(newValue);
        const tabRoutes = ['/admin', '/admin/audit', '/admin/users', '/admin/roles', '/admin/settings'];
        if (tabRoutes[newValue] && location.pathname !== tabRoutes[newValue]) {
            navigate(tabRoutes[newValue], { replace: true });
        }
    };

    const handleRefresh = () => {
        setRefreshKey(prev => prev + 1);
    };

    const statCards = [
        {
            title: 'Total Users',
            value: stats?.totalUsers || 0,
            icon: <PeopleIcon />,
            color: 'primary.main',
            trend: stats?.userTrend || 0
        },
        {
            title: 'Total Documents',
            value: stats?.totalDocuments || 0,
            icon: <DescriptionIcon />,
            color: 'info.main',
            trend: stats?.documentTrend || 0
        },
        {
            title: 'Chat Queries',
            value: stats?.totalChatQueries || 0,
            icon: <ChatIcon />,
            color: 'success.main',
            trend: stats?.chatTrend || 0
        },
        {
            title: 'Security Events',
            value: stats?.securityEvents || 0,
            icon: <WarningIcon />,
            color: 'warning.main',
            trend: stats?.securityTrend || 0
        }
    ];

    const tabs = [
        { label: 'Overview', icon: <AssessmentIcon /> },
        { label: 'Audit Dashboard', icon: <AssessmentIcon /> },
        { label: 'Users', icon: <PeopleIcon /> },
        { label: 'Roles', icon: <SecurityIcon /> },
        { label: 'Settings', icon: <SettingsIcon /> }
    ];

    if (loading && !stats) {
        return (
            <Box sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '60vh'
            }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box sx={{ p: 3 }}>
            {/* Header */}
            <Box sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 3
            }}>
                <Box>
                    <Typography variant="h5" gutterBottom>
                        Admin Dashboard
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        System management and monitoring
                    </Typography>
                </Box>

                <Tooltip title="Refresh">
                    <IconButton onClick={handleRefresh} disabled={loading}>
                        <RefreshIcon />
                    </IconButton>
                </Tooltip>
            </Box>

            {/* Error alert */}
            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            {/* Stats Cards */}
            {activeTab === 0 && (
                <Grid container spacing={2} sx={{ mb: 3 }}>
                    {statCards.map((card, index) => (
                        <Grid item xs={12} sm={6} md={3} key={index}>
                            <Card>
                                <CardContent>
                                    <Box sx={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        mb: 1
                                    }}>
                                        <Typography variant="caption" color="text.secondary">
                                            {card.title}
                                        </Typography>
                                        <Box sx={{ color: card.color }}>
                                            {card.icon}
                                        </Box>
                                    </Box>

                                    <Typography variant="h4" sx={{ fontWeight: 700 }}>
                                        {formatNumber(card.value)}
                                    </Typography>

                                    {card.trend !== 0 && (
                                        <Box sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 0.5,
                                            mt: 0.5
                                        }}>
                                            {card.trend > 0 ? (
                                                <TrendingUpIcon sx={{ fontSize: 16, color: 'success.main' }} />
                                            ) : (
                                                <TrendingDownIcon sx={{ fontSize: 16, color: 'error.main' }} />
                                            )}
                                            <Typography
                                                variant="caption"
                                                sx={{
                                                    color: card.trend > 0 ? 'success.main' : 'error.main',
                                                    fontWeight: 600
                                                }}
                                            >
                                                {Math.abs(card.trend)}%
                                            </Typography>
                                        </Box>
                                    )}
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}

                    {/* Recent Activity */}
                    <Grid item xs={12} md={6}>
                        <Card>
                            <CardHeader
                                title="Recent Activity"
                                subheader="Latest system events"
                            />
                            <CardContent>
                                {stats?.recentActivity?.length === 0 ? (
                                    <Typography variant="body2" color="text.secondary">
                                        No recent activity
                                    </Typography>
                                ) : (
                                    <List>
                                        {stats?.recentActivity?.map((activity, index) => (
                                            <React.Fragment key={index}>
                                                <ListItem>
                                                    <ListItemAvatar>
                                                        <Avatar sx={{ bgcolor: 'primary.main' }}>
                                                            <AdminIcon />
                                                        </Avatar>
                                                    </ListItemAvatar>
                                                    <ListItemText
                                                        primary={activity.action}
                                                        secondary={activity.timestamp}
                                                    />
                                                    <Chip
                                                        label={activity.status}
                                                        size="small"
                                                        color={activity.status === 'success' ? 'success' : 'error'}
                                                    />
                                                </ListItem>
                                                {index < (stats.recentActivity.length - 1) && <Divider />}
                                            </React.Fragment>
                                        ))}
                                    </List>
                                )}
                            </CardContent>
                        </Card>
                    </Grid>

                    {/* Quick Actions */}
                    <Grid item xs={12} md={6}>
                        <Card>
                            <CardHeader
                                title="Quick Actions"
                                subheader="Common administrative tasks"
                            />
                            <CardContent>
                                <Grid container spacing={1}>
                                    {hasPermission('user:create') && (
                                        <Grid item xs={6}>
                                            <Button
                                                fullWidth
                                                variant="outlined"
                                                startIcon={<AddIcon />}
                                                onClick={() => {
                                                    setActiveTab(2);
                                                    navigate('/admin/users');
                                                }}
                                            >
                                                Add User
                                            </Button>
                                        </Grid>
                                    )}

                                    {hasPermission('role:manage') && (
                                        <Grid item xs={6}>
                                            <Button
                                                fullWidth
                                                variant="outlined"
                                                startIcon={<SecurityIcon />}
                                                onClick={() => {
                                                    setActiveTab(3);
                                                    navigate('/admin/roles');
                                                }}
                                            >
                                                Manage Roles
                                            </Button>
                                        </Grid>
                                    )}

                                    {hasPermission('audit:view') && (
                                        <Grid item xs={6}>
                                            <Button
                                                fullWidth
                                                variant="outlined"
                                                startIcon={<AssessmentIcon />}
                                                onClick={() => {
                                                    setActiveTab(1);
                                                    navigate('/admin/audit');
                                                }}
                                            >
                                                View Audit Logs
                                            </Button>
                                        </Grid>
                                    )}

                                    {hasPermission('system:configure') && (
                                        <Grid item xs={6}>
                                            <Button
                                                fullWidth
                                                variant="outlined"
                                                startIcon={<SettingsIcon />}
                                                onClick={() => {
                                                    setActiveTab(4);
                                                    navigate('/admin/settings');
                                                }}
                                            >
                                                System Settings
                                            </Button>
                                        </Grid>
                                    )}
                                </Grid>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            )}

            {/* Tabs */}
            <Tabs
                value={activeTab}
                onChange={handleTabChange}
                sx={{ mb: 2 }}
            >
                {tabs.map((tab, index) => (
                    <Tab
                        key={index}
                        label={tab.label}
                        icon={tab.icon}
                        iconPosition="start"
                    />
                ))}
            </Tabs>

            {/* Tab Content */}
            <Box>
                {activeTab === 0 && (
                    <Typography variant="body2" color="text.secondary">
                        Select a tab above to manage specific aspects of the system
                    </Typography>
                )}

                {activeTab === 1 && hasPermission('audit:view') && (
                    <AuditDashboard />
                )}

                {activeTab === 2 && hasPermission('user:manage') && (
                    <UserManagement />
                )}

                {activeTab === 3 && hasPermission('role:manage') && (
                    <RoleManagement />
                )}

                {activeTab === 4 && hasPermission('system:configure') && (
                    <Settings />
                )}
            </Box>
        </Box>
    );
};

export default AdminDashboard;