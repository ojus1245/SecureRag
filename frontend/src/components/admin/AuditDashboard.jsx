import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Box,
    Paper,
    Typography,
    Grid,
    Card,
    CardContent,
    CardHeader,
    IconButton,
    Tooltip,
    Chip,
    Divider,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Button,
    Alert,
    CircularProgress,
    LinearProgress,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    ListItemAvatar,
    Avatar,
    Badge,
    Tab,
    Tabs
} from '@mui/material';
import {
    Security as SecurityIcon,
    Warning as WarningIcon,
    Error as ErrorIcon,
    CheckCircle as CheckCircleIcon,
    Info as InfoIcon,
    Timeline as TimelineIcon,
    TrendingUp as TrendingUpIcon,
    TrendingDown as TrendingDownIcon,
    People as PeopleIcon,
    Description as DescriptionIcon,
    Chat as ChatIcon,
    Storage as StorageIcon,
    Refresh as RefreshIcon,
    Download as DownloadIcon,
    FilterList as FilterListIcon,
    Assessment as AssessmentIcon,
    Dashboard as DashboardIcon
} from '@mui/icons-material';
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    PieChart,
    Pie,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as ChartTooltip,
    Legend,
    ResponsiveContainer,
    Cell
} from 'recharts';
import { auditService } from '../../services/auditService';
import { formatDate, formatDuration, formatNumber } from '../../utils/helpers';

const AuditDashboard = ({ onViewLogs, onExport }) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [stats, setStats] = useState(null);
    const [timeRange, setTimeRange] = useState('7d');
    const [selectedTab, setSelectedTab] = useState(0);
    const [refreshInterval, setRefreshInterval] = useState(30000);

    const fetchStats = useCallback(async () => {
        try {
            const result = await auditService.getAuditStats({
                timeRange
            });
            setStats(result);
            setError(null);
        } catch (error) {
            console.error('Failed to fetch audit stats:', error);
            setError('Failed to load audit statistics');
        } finally {
            setLoading(false);
        }
    }, [timeRange]);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    useEffect(() => {
        if (refreshInterval > 0) {
            const interval = setInterval(fetchStats, refreshInterval);
            return () => clearInterval(interval);
        }
    }, [refreshInterval, fetchStats]);

    const handleRefresh = () => {
        setLoading(true);
        fetchStats();
    };

    const handleTimeRangeChange = (event) => {
        setTimeRange(event.target.value);
    };

    const handleExport = async () => {
        if (onExport) {
            onExport(stats);
        }
    };

    const summaryCards = useMemo(() => {
        if (!stats?.summary) return [];

        return [
            {
                title: 'Total Events',
                value: stats.summary.totalLogs,
                icon: <AssessmentIcon />,
                color: 'primary.main',
                trend: stats.trends?.total || 0
            },
            {
                title: 'Success Rate',
                value: `${((stats.summary.successCount / stats.summary.totalLogs) * 100).toFixed(1)}%`,
                icon: <CheckCircleIcon />,
                color: 'success.main',
                trend: stats.trends?.success || 0
            },
            {
                title: 'Failures',
                value: stats.summary.failureCount,
                icon: <ErrorIcon />,
                color: 'error.main',
                trend: stats.trends?.failure || 0
            },
            {
                title: 'Security Events',
                value: stats.summary.warningCount,
                icon: <WarningIcon />,
                color: 'warning.main',
                trend: stats.trends?.warning || 0
            },
            {
                title: 'Unique Users',
                value: stats.summary.uniqueUsers,
                icon: <PeopleIcon />,
                color: 'info.main',
                trend: stats.trends?.users || 0
            },
            {
                title: 'Unique Actions',
                value: stats.summary.uniqueActions,
                icon: <TimelineIcon />,
                color: 'secondary.main',
                trend: stats.trends?.actions || 0
            }
        ];
    }, [stats]);

    const chartData = useMemo(() => {
        if (!stats?.daily) return [];
        return stats.daily.map(d => ({
            date: d._id,
            count: d.count,
            success: d.successCount || 0,
            failure: d.failureCount || 0,
            warning: d.warningCount || 0
        }));
    }, [stats]);

    const actionData = useMemo(() => {
        if (!stats?.byAction) return [];
        return stats.byAction.slice(0, 10).map(a => ({
            name: a._id,
            value: a.count
        }));
    }, [stats]);

    const resourceData = useMemo(() => {
        if (!stats?.byResource) return [];
        return stats.byResource.map(r => ({
            name: r._id || 'unknown',
            value: r.count
        }));
    }, [stats]);

    const userData = useMemo(() => {
        if (!stats?.byUser) return [];
        return stats.byUser.slice(0, 10).map(u => ({
            name: u.username || 'unknown',
            value: u.count
        }));
    }, [stats]);

    const PIE_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FF6B6B', '#4ECDC4'];

    if (loading && !stats) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
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
                        Audit Dashboard
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Monitor system activity and security events
                    </Typography>
                </Box>

                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                        <InputLabel>Time Range</InputLabel>
                        <Select
                            value={timeRange}
                            onChange={handleTimeRangeChange}
                            label="Time Range"
                        >
                            <MenuItem value="1h">Last Hour</MenuItem>
                            <MenuItem value="24h">Last 24 Hours</MenuItem>
                            <MenuItem value="7d">Last 7 Days</MenuItem>
                            <MenuItem value="30d">Last 30 Days</MenuItem>
                            <MenuItem value="90d">Last 90 Days</MenuItem>
                        </Select>
                    </FormControl>

                    <Tooltip title="Refresh">
                        <IconButton onClick={handleRefresh} disabled={loading}>
                            <RefreshIcon />
                        </IconButton>
                    </Tooltip>

                    <Tooltip title="Export">
                        <IconButton onClick={handleExport}>
                            <DownloadIcon />
                        </IconButton>
                    </Tooltip>
                </Box>
            </Box>

            {/* Error alert */}
            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            {/* Summary Cards */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                {summaryCards.map((card, index) => (
                    <Grid item xs={12} sm={6} md={4} lg={2} key={index}>
                        <Card>
                            <CardContent>
                                <Box sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    mb: 1
                                }}>
                                    <Typography variant="caption" color="text.secondary">
                                        {card.title}
                                    </Typography>
                                    <Box sx={{ color: card.color }}>
                                        {card.icon}
                                    </Box>
                                </Box>

                                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                                    {card.value}
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
            </Grid>

            {/* Tabs */}
            <Tabs
                value={selectedTab}
                onChange={(e, v) => setSelectedTab(v)}
                sx={{ mb: 2 }}
            >
                <Tab label="Activity" />
                <Tab label="Actions" />
                <Tab label="Users" />
                <Tab label="Resources" />
            </Tabs>

            {/* Charts */}
            {selectedTab === 0 && (
                <Grid container spacing={2}>
                    {/* Activity over time */}
                    <Grid item xs={12}>
                        <Paper sx={{ p: 2 }}>
                            <Typography variant="subtitle1" gutterBottom>
                                Activity Over Time
                            </Typography>
                            <ResponsiveContainer width="100%" height={300}>
                                <AreaChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="date" />
                                    <YAxis />
                                    <ChartTooltip />
                                    <Legend />
                                    <Area
                                        type="monotone"
                                        dataKey="count"
                                        stroke="#8884d8"
                                        fill="#8884d8"
                                        fillOpacity={0.3}
                                        name="Total Events"
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="success"
                                        stroke="#82ca9d"
                                        fill="#82ca9d"
                                        fillOpacity={0.3}
                                        name="Success"
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="failure"
                                        stroke="#ff7300"
                                        fill="#ff7300"
                                        fillOpacity={0.3}
                                        name="Failure"
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="warning"
                                        stroke="#ffc658"
                                        fill="#ffc658"
                                        fillOpacity={0.3}
                                        name="Warning"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </Paper>
                    </Grid>
                </Grid>
            )}

            {selectedTab === 1 && (
                <Grid container spacing={2}>
                    {/* Actions distribution */}
                    <Grid item xs={12} md={6}>
                        <Paper sx={{ p: 2 }}>
                            <Typography variant="subtitle1" gutterBottom>
                                Top Actions
                            </Typography>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={actionData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                                    <YAxis />
                                    <ChartTooltip />
                                    <Bar dataKey="value" fill="#8884d8" name="Count" />
                                </BarChart>
                            </ResponsiveContainer>
                        </Paper>
                    </Grid>

                    {/* Actions pie chart */}
                    <Grid item xs={12} md={6}>
                        <Paper sx={{ p: 2 }}>
                            <Typography variant="subtitle1" gutterBottom>
                                Action Distribution
                            </Typography>
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie
                                        data={actionData}
                                        dataKey="value"
                                        nameKey="name"
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={100}
                                        label
                                    >
                                        {actionData.map((entry, index) => (
                                            <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <ChartTooltip />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </Paper>
                    </Grid>
                </Grid>
            )}

            {selectedTab === 2 && (
                <Grid container spacing={2}>
                    {/* User activity */}
                    <Grid item xs={12}>
                        <Paper sx={{ p: 2 }}>
                            <Typography variant="subtitle1" gutterBottom>
                                User Activity
                            </Typography>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={userData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <ChartTooltip />
                                    <Bar dataKey="value" fill="#82ca9d" name="Events" />
                                </BarChart>
                            </ResponsiveContainer>
                        </Paper>
                    </Grid>
                </Grid>
            )}

            {selectedTab === 3 && (
                <Grid container spacing={2}>
                    {/* Resource distribution */}
                    <Grid item xs={12} md={6}>
                        <Paper sx={{ p: 2 }}>
                            <Typography variant="subtitle1" gutterBottom>
                                Resource Usage
                            </Typography>
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie
                                        data={resourceData}
                                        dataKey="value"
                                        nameKey="name"
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={100}
                                        label
                                    >
                                        {resourceData.map((entry, index) => (
                                            <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <ChartTooltip />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </Paper>
                    </Grid>

                    {/* Resource stats */}
                    <Grid item xs={12} md={6}>
                        <Paper sx={{ p: 2 }}>
                            <Typography variant="subtitle1" gutterBottom>
                                Resource Details
                            </Typography>
                            <List>
                                {resourceData.map((resource, index) => (
                                    <React.Fragment key={index}>
                                        <ListItem>
                                            <ListItemIcon>
                                                {resource.name === 'document' ? <DescriptionIcon /> :
                                                    resource.name === 'chat' ? <ChatIcon /> :
                                                        resource.name === 'user' ? <PeopleIcon /> :
                                                            resource.name === 'audit' ? <SecurityIcon /> :
                                                                <StorageIcon />}
                                            </ListItemIcon>
                                            <ListItemText
                                                primary={resource.name}
                                                secondary={`${resource.value} events`}
                                            />
                                            <Typography variant="body2" color="text.secondary">
                                                {((resource.value / (stats?.summary?.totalLogs || 1)) * 100).toFixed(1)}%
                                            </Typography>
                                        </ListItem>
                                        {index < resourceData.length - 1 && <Divider />}
                                    </React.Fragment>
                                ))}
                            </List>
                        </Paper>
                    </Grid>
                </Grid>
            )}

            {/* View all logs button */}
            <Box sx={{
                display: 'flex',
                justifyContent: 'center',
                mt: 3
            }}>
                <Button
                    variant="outlined"
                    onClick={onViewLogs}
                    startIcon={<AssessmentIcon />}
                >
                    View All Audit Logs
                </Button>
            </Box>
        </Box>
    );
};

export default AuditDashboard;