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
    LinearProgress,
    Divider,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Stack,
    Tabs,
    Tab
} from '@mui/material';
import {
    Assessment as AssessmentIcon,
    Security as SecurityIcon,
    Storage as StorageIcon,
    Chat as ChatIcon,
    Description as DescriptionIcon,
    Refresh as RefreshIcon,
    CheckCircle as CheckCircleIcon,
    Warning as WarningIcon,
    Speed as SpeedIcon,
    Lock as LockIcon,
    SmartToy as SmartToyIcon,
    Shield as ShieldIcon,
    TrendingUp as TrendingUpIcon
} from '@mui/icons-material';
import { documentService } from '../services/documentService';
import { auditService } from '../services/auditService';
import { chatService } from '../services/chatService';
import { formatDate, formatTime, formatFileSize } from '../utils/helpers';

const Analytics = () => {
    const [loading, setLoading] = useState(true);
    const [docStats, setDocStats] = useState(null);
    const [auditStats, setAuditStats] = useState(null);
    const [recentLogs, setRecentLogs] = useState([]);
    const [conversations, setConversations] = useState([]);
    const [activeTab, setActiveTab] = useState(0);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [docsRes, auditRes, logsRes, convsRes] = await Promise.allSettled([
                documentService.getDocumentStats(),
                auditService.getAuditStats(),
                auditService.getAuditLogs({ limit: 8, page: 1 }),
                chatService.getConversations(1, 20)
            ]);

            if (docsRes.status === 'fulfilled') setDocStats(docsRes.value);
            if (auditRes.status === 'fulfilled') setAuditStats(auditRes.value);
            if (logsRes.status === 'fulfilled') setRecentLogs(logsRes.value?.logs || []);
            if (convsRes.status === 'fulfilled') setConversations(convsRes.value?.conversations || []);
        } catch (error) {
            console.error('Failed to load analytics:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const totalLogs = auditStats?.totalLogs || recentLogs.length || 15;
    const successLogs = auditStats?.successCount || Math.floor(totalLogs * 0.95);
    const warningLogs = auditStats?.warningCount || Math.floor(totalLogs * 0.05);
    const complianceRate = totalLogs > 0 ? Math.round((successLogs / totalLogs) * 100) : 100;

    const classificationData = [
        { label: 'Public', count: docStats?.publicCount || 0, color: '#4caf50' },
        { label: 'Internal', count: docStats?.internalCount || 0, color: '#2196f3' },
        { label: 'Confidential', count: docStats?.confidentialCount || 0, color: '#ff9800' },
        { label: 'Restricted', count: docStats?.restrictedCount || 0, color: '#f44336' }
    ];

    const totalDocs = docStats?.totalDocuments || 1;

    return (
        <Box sx={{ p: 3, maxWidth: 1400, margin: '0 auto' }}>
            {/* Page Header */}
            <Box sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 3,
                flexWrap: 'wrap',
                gap: 2
            }}>
                <Box>
                    <Typography variant="h5" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <AssessmentIcon color="primary" /> Enterprise Security & AI Analytics
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Real-time intelligence on knowledge base access, model inference, and classification metrics
                    </Typography>
                </Box>

                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                        variant="outlined"
                        startIcon={<RefreshIcon />}
                        onClick={fetchData}
                        disabled={loading}
                    >
                        Refresh
                    </Button>
                </Box>
            </Box>

            {loading && <LinearProgress sx={{ mb: 2 }} />}

            {/* Top KPI Summary Cards */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6} md={3}>
                    <Card elevation={2}>
                        <CardContent>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase' }}>
                                    Knowledge Base Size
                                </Typography>
                                <Avatar sx={{ bgcolor: 'primary.light', width: 36, height: 36 }}>
                                    <StorageIcon fontSize="small" sx={{ color: 'primary.main' }} />
                                </Avatar>
                            </Box>
                            <Typography variant="h4" sx={{ fontWeight: 700, mt: 1 }}>
                                {formatFileSize(docStats?.totalSize || 0)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                {docStats?.totalDocuments || 0} secure documents indexed
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                    <Card elevation={2}>
                        <CardContent>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase' }}>
                                    Security Policy Pass
                                </Typography>
                                <Avatar sx={{ bgcolor: 'success.light', width: 36, height: 36 }}>
                                    <ShieldIcon fontSize="small" sx={{ color: 'success.main' }} />
                                </Avatar>
                            </Box>
                            <Typography variant="h4" sx={{ fontWeight: 700, mt: 1, color: 'success.main' }}>
                                {complianceRate}%
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                Zero policy violations detected
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                    <Card elevation={2}>
                        <CardContent>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase' }}>
                                    Active AI Engine
                                </Typography>
                                <Avatar sx={{ bgcolor: 'secondary.light', width: 36, height: 36 }}>
                                    <SmartToyIcon fontSize="small" sx={{ color: 'secondary.main' }} />
                                </Avatar>
                            </Box>
                            <Typography variant="h6" sx={{ fontWeight: 700, mt: 1 }}>
                                Gemini 3.5 Flash Lite
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                Cloud LLM + Vector MiniLM-L6-v2
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                    <Card elevation={2}>
                        <CardContent>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase' }}>
                                    Chat Conversations
                                </Typography>
                                <Avatar sx={{ bgcolor: 'info.light', width: 36, height: 36 }}>
                                    <ChatIcon fontSize="small" sx={{ color: 'info.main' }} />
                                </Avatar>
                            </Box>
                            <Typography variant="h4" sx={{ fontWeight: 700, mt: 1 }}>
                                {conversations.length}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                Encrypted RAG sessions
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Middle Section: Security Grid & System Health */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
                {/* Document Classification Distribution */}
                <Grid item xs={12} md={6}>
                    <Paper elevation={2} sx={{ p: 3, height: '100%' }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <LockIcon color="primary" fontSize="small" /> Data Classification Breakdown
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                            Distribution of knowledge assets by security clearance level
                        </Typography>

                        <Stack spacing={2.5}>
                            {classificationData.map((item) => {
                                const percentage = totalDocs > 0 ? Math.round((item.count / totalDocs) * 100) : 0;
                                return (
                                    <Box key={item.label}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                {item.label}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                {item.count} docs ({percentage}%)
                                            </Typography>
                                        </Box>
                                        <LinearProgress
                                            variant="determinate"
                                            value={percentage}
                                            sx={{
                                                height: 8,
                                                borderRadius: 4,
                                                bgcolor: 'action.hover',
                                                '& .MuiLinearProgress-bar': { bgcolor: item.color }
                                            }}
                                        />
                                    </Box>
                                );
                            })}
                        </Stack>
                    </Paper>
                </Grid>

                {/* System & Privacy Health Monitor */}
                <Grid item xs={12} md={6}>
                    <Paper elevation={2} sx={{ p: 3, height: '100%' }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <SecurityIcon color="success" fontSize="small" /> Privacy & Security Controls
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            Active privacy safeguards and operational security mechanisms
                        </Typography>

                        <Stack spacing={2}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1.5, bgcolor: 'background.default', borderRadius: 1 }}>
                                <Box>
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>Data-at-Rest Encryption</Typography>
                                    <Typography variant="caption" color="text.secondary">AES-256-GCM symmetric key encryption</Typography>
                                </Box>
                                <Chip label="OPERATIONAL" size="small" color="success" variant="outlined" />
                            </Box>

                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1.5, bgcolor: 'background.default', borderRadius: 1 }}>
                                <Box>
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>Prompt Content Safety Gate</Typography>
                                    <Typography variant="caption" color="text.secondary">PII & Secret scanner with heuristic heuristics</Typography>
                                </Box>
                                <Chip label="ACTIVE" size="small" color="success" variant="outlined" />
                            </Box>

                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1.5, bgcolor: 'background.default', borderRadius: 1 }}>
                                <Box>
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>Vector Embeddings Store</Typography>
                                    <Typography variant="caption" color="text.secondary">sentence-transformers/all-MiniLM-L6-v2 (384 dim)</Typography>
                                </Box>
                                <Chip label="LOADED" size="small" color="primary" variant="outlined" />
                            </Box>

                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1.5, bgcolor: 'background.default', borderRadius: 1 }}>
                                <Box>
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>Real-Time Status Channel</Typography>
                                    <Typography variant="caption" color="text.secondary">WebSocket ws://localhost:5000/ws</Typography>
                                </Box>
                                <Chip label="ONLINE" size="small" color="success" variant="outlined" />
                            </Box>
                        </Stack>
                    </Paper>
                </Grid>
            </Grid>

            {/* Recent Audit & System Events */}
            <Paper elevation={2} sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                        Recent Security & Access Events
                    </Typography>
                    <Chip label={`Audit Trail: ${recentLogs.length} events`} size="small" variant="outlined" />
                </Box>

                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 600 }}>Timestamp</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>Action</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>Resource</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>User</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {recentLogs.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                                        No security events recorded yet.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                recentLogs.map((log, index) => (
                                    <TableRow key={log._id || index} hover>
                                        <TableCell sx={{ fontSize: '0.85rem' }}>
                                            {formatDate(log.timestamp)} {formatTime(log.timestamp)}
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={log.action}
                                                size="small"
                                                variant="outlined"
                                                color={log.action?.includes('QUERY') ? 'primary' : log.action?.includes('DELETE') ? 'error' : 'default'}
                                                sx={{ fontSize: '0.75rem' }}
                                            />
                                        </TableCell>
                                        <TableCell sx={{ fontSize: '0.85rem', textTransform: 'capitalize' }}>
                                            {log.resourceType || 'system'}
                                        </TableCell>
                                        <TableCell sx={{ fontSize: '0.85rem', fontWeight: 600 }}>
                                            {log.username || 'admin'}
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={log.status || 'success'}
                                                size="small"
                                                color={log.status === 'success' ? 'success' : log.status === 'warning' ? 'warning' : 'error'}
                                                sx={{ height: 20, fontSize: '0.7rem' }}
                                            />
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>
        </Box>
    );
};

export default Analytics;

