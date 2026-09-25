import React, { useState, useEffect, useCallback } from 'react';
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
    Button,
    Alert,
    CircularProgress,
    TextField,
    InputAdornment,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Tabs,
    Tab,
    Badge,
    Stack
} from '@mui/material';
import {
    Search as SearchIcon,
    FilterList as FilterListIcon,
    Refresh as RefreshIcon,
    Download as DownloadIcon,
    Assessment as AssessmentIcon,
    Security as SecurityIcon,
    Warning as WarningIcon,
    Error as ErrorIcon,
    CheckCircle as CheckCircleIcon,
    Timeline as TimelineIcon,
    Storage as StorageIcon,
    People as PeopleIcon,
    Description as DescriptionIcon,
    Chat as ChatIcon
} from '@mui/icons-material';
import AuditDashboard from '../components/admin/AuditDashboard';
import AuditTable from '../components/admin/AuditTable';
import { auditService } from '../services/auditService';
import { formatDate, formatTime, formatDuration } from '../utils/helpers';

const AuditLogs = () => {
    const [activeTab, setActiveTab] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [stats, setStats] = useState(null);
    const [exporting, setExporting] = useState(false);

    const fetchStats = useCallback(async () => {
        try {
            const result = await auditService.getAuditStats();
            setStats(result);
        } catch (error) {
            console.error('Failed to fetch stats:', error);
            setError('Failed to load audit statistics');
        }
    }, []);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    const handleTabChange = (event, newValue) => {
        setActiveTab(newValue);
    };

    const handleExport = async (data) => {
        setExporting(true);

        try {
            const result = await auditService.exportAuditLogs({
                format: 'csv'
            });

            // Create download link
            const blob = new Blob([result], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `audit-logs-${Date.now()}.csv`;
            a.click();
            URL.revokeObjectURL(url);

        } catch (error) {
            console.error('Export failed:', error);
            setError('Failed to export audit logs');
        } finally {
            setExporting(false);
        }
    };

    const tabs = [
        { label: 'Dashboard', icon: <AssessmentIcon /> },
        { label: 'Logs', icon: <StorageIcon /> }
    ];

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
                        Audit Logs
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        View and analyze system audit trail
                    </Typography>
                </Box>

                <Button
                    variant="outlined"
                    startIcon={exporting ? <CircularProgress size={16} /> : <DownloadIcon />}
                    onClick={() => handleExport()}
                    disabled={exporting}
                >
                    Export Logs
                </Button>
            </Box>

            {/* Error alert */}
            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            {/* Stats Cards */}
            {stats?.summary && (
                <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid item xs={12} sm={6} md={3}>
                        <Card>
                            <CardContent>
                                <Box sx={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    mb: 1
                                }}>
                                    <Typography variant="caption" color="text.secondary">
                                        Total Events
                                    </Typography>
                                    <TimelineIcon sx={{ color: 'primary.main', fontSize: 20 }} />
                                </Box>
                                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                                    {stats.summary.totalLogs}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>

                    <Grid item xs={12} sm={6} md={3}>
                        <Card>
                            <CardContent>
                                <Box sx={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    mb: 1
                                }}>
                                    <Typography variant="caption" color="text.secondary">
                                        Success Rate
                                    </Typography>
                                    <CheckCircleIcon sx={{ color: 'success.main', fontSize: 20 }} />
                                </Box>
                                <Typography variant="h4" sx={{ fontWeight: 700, color: 'success.main' }}>
                                    {((stats.summary.successCount / stats.summary.totalLogs) * 100).toFixed(1)}%
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>

                    <Grid item xs={12} sm={6} md={3}>
                        <Card>
                            <CardContent>
                                <Box sx={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    mb: 1
                                }}>
                                    <Typography variant="caption" color="text.secondary">
                                        Failures
                                    </Typography>
                                    <ErrorIcon sx={{ color: 'error.main', fontSize: 20 }} />
                                </Box>
                                <Typography variant="h4" sx={{ fontWeight: 700, color: 'error.main' }}>
                                    {stats.summary.failureCount}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>

                    <Grid item xs={12} sm={6} md={3}>
                        <Card>
                            <CardContent>
                                <Box sx={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    mb: 1
                                }}>
                                    <Typography variant="caption" color="text.secondary">
                                        Security Events
                                    </Typography>
                                    <SecurityIcon sx={{ color: 'warning.main', fontSize: 20 }} />
                                </Box>
                                <Typography variant="h4" sx={{ fontWeight: 700, color: 'warning.main' }}>
                                    {stats.summary.warningCount}
                                </Typography>
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
                    <AuditDashboard
                        onViewLogs={() => setActiveTab(1)}
                        onExport={handleExport}
                    />
                )}

                {activeTab === 1 && (
                    <AuditTable
                        onExport={handleExport}
                    />
                )}
            </Box>
        </Box>
    );
};

export default AuditLogs;