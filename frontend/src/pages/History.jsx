import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Paper,
    Typography,
    Grid,
    Tabs,
    Tab,
    List,
    ListItemButton,
    ListItemText,
    ListItemAvatar,
    Avatar,
    Divider,
    IconButton,
    Tooltip,
    Button,
    Chip,
    TextField,
    InputAdornment,
    CircularProgress,
    Card,
    CardContent,
    CardActions,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Snackbar,
    Alert,
    LinearProgress
} from '@mui/material';
import {
    History as HistoryIcon,
    Chat as ChatIcon,
    Search as SearchIcon,
    Delete as DeleteIcon,
    Launch as LaunchIcon,
    Download as DownloadIcon,
    Refresh as RefreshIcon,
    Security as SecurityIcon,
    CalendarToday as CalendarIcon,
    Source as SourceIcon,
    CheckCircle as CheckCircleIcon,
    Close as CloseIcon
} from '@mui/icons-material';
import { chatService } from '../services/chatService';
import { auditService } from '../services/auditService';
import { formatDate, formatTime } from '../utils/helpers';

const History = () => {
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState(0);
    const [conversations, setConversations] = useState([]);
    const [auditLogs, setAuditLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Selected conversation for preview
    const [selectedConv, setSelectedConv] = useState(null);
    const [convMessages, setConvMessages] = useState([]);
    const [loadingMessages, setLoadingMessages] = useState(false);

    // Selected audit log for detail dialog
    const [selectedLog, setSelectedLog] = useState(null);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

    const fetchHistoryData = useCallback(async () => {
        setLoading(true);
        try {
            const [convsRes, logsRes] = await Promise.allSettled([
                chatService.getConversations(1, 50),
                auditService.getAuditLogs({ limit: 50, page: 1 })
            ]);

            if (convsRes.status === 'fulfilled') {
                const list = convsRes.value?.conversations || [];
                setConversations(list);
                if (list.length > 0 && !selectedConv) {
                    loadConversationPreview(list[0]);
                }
            }
            if (logsRes.status === 'fulfilled') {
                setAuditLogs(logsRes.value?.logs || []);
            }
        } catch (error) {
            console.error('Failed to fetch history:', error);
        } finally {
            setLoading(false);
        }
    }, [selectedConv]);

    useEffect(() => {
        fetchHistoryData();
    }, []);

    const loadConversationPreview = async (conv) => {
        setSelectedConv(conv);
        setLoadingMessages(true);
        const id = conv.id || conv._id;
        try {
            const res = await chatService.getConversationMessages(id);
            setConvMessages(res?.messages || []);
        } catch (error) {
            console.error('Failed to load conversation preview:', error);
            setConvMessages([]);
        } finally {
            setLoadingMessages(false);
        }
    };

    const handleDeleteConversation = async (convId, e) => {
        e?.stopPropagation();
        try {
            await chatService.deleteConversation(convId);
            setConversations(prev => prev.filter(c => (c.id || c._id) !== convId));
            if (selectedConv && (selectedConv.id === convId || selectedConv._id === convId)) {
                setSelectedConv(null);
                setConvMessages([]);
            }
            setSnackbar({ open: true, message: 'Conversation deleted', severity: 'info' });
        } catch (error) {
            console.error('Failed to delete conversation:', error);
        }
    };

    const handleContinueChat = (convId) => {
        navigate(`/chat/${convId}`);
    };

    const handleExportAudit = () => {
        const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(auditLogs, null, 2));
        const a = document.createElement('a');
        a.href = dataStr;
        a.download = `audit-history-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        setSnackbar({ open: true, message: 'Audit history exported as JSON', severity: 'success' });
    };

    const filteredConversations = conversations.filter(c =>
        (c.title || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredLogs = auditLogs.filter(l =>
        (l.action || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (l.username || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (l.resourceType || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <Box sx={{ p: 3, maxWidth: 1400, margin: '0 auto' }}>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
                <Box>
                    <Typography variant="h5" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <HistoryIcon color="primary" /> Activity & Conversation History
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Review past encrypted chat sessions, model responses, and enterprise compliance logs
                    </Typography>
                </Box>

                <Box sx={{ display: 'flex', gap: 1 }}>
                    <TextField
                        size="small"
                        placeholder="Search history..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        InputProps={{
                            startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>
                        }}
                        sx={{ minWidth: 220 }}
                    />
                    <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchHistoryData}>
                        Refresh
                    </Button>
                </Box>
            </Box>

            {/* Navigation Tabs */}
            <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
                <Tab label={`Chat Conversations (${conversations.length})`} icon={<ChatIcon />} iconPosition="start" />
                <Tab label={`Security & Audit Trail (${auditLogs.length})`} icon={<SecurityIcon />} iconPosition="start" />
            </Tabs>

            {loading && <LinearProgress sx={{ mb: 2 }} />}

            {/* TAB 0: Chat Conversations */}
            {activeTab === 0 && (
                <Grid container spacing={3}>
                    {/* Left: Conversation List */}
                    <Grid item xs={12} md={5}>
                        <Paper elevation={2} sx={{ height: 600, display: 'flex', flexDirection: 'column' }}>
                            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                                    Recorded Sessions ({filteredConversations.length})
                                </Typography>
                                <Button
                                    size="small"
                                    variant="contained"
                                    startIcon={<ChatIcon />}
                                    onClick={() => navigate('/chat')}
                                >
                                    New Chat
                                </Button>
                            </Box>

                            <Box sx={{ flex: 1, overflowY: 'auto' }}>
                                {filteredConversations.length === 0 ? (
                                    <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
                                        <ChatIcon sx={{ fontSize: 48, opacity: 0.3, mb: 1 }} />
                                        <Typography variant="body2">No conversations recorded yet</Typography>
                                    </Box>
                                ) : (
                                    <List disablePadding>
                                        {filteredConversations.map((conv) => {
                                            const id = conv.id || conv._id;
                                            const isSelected = selectedConv && (selectedConv.id === id || selectedConv._id === id);
                                            return (
                                                <React.Fragment key={id}>
                                                    <ListItemButton
                                                        selected={isSelected}
                                                        onClick={() => loadConversationPreview(conv)}
                                                        sx={{
                                                            py: 1.5,
                                                            '&.Mui-selected': { bgcolor: 'action.selected', borderLeft: 4, borderColor: 'primary.main' }
                                                        }}
                                                    >
                                                        <ListItemAvatar>
                                                            <Avatar sx={{ bgcolor: 'primary.main', width: 36, height: 36 }}>
                                                                <ChatIcon fontSize="small" />
                                                            </Avatar>
                                                        </ListItemAvatar>
                                                        <ListItemText
                                                            primary={<Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>{conv.title || 'Untitled'}</Typography>}
                                                            secondary={<Typography variant="caption" color="text.secondary">{conv.updatedAt ? `${formatDate(conv.updatedAt)} - ${formatTime(conv.updatedAt)}` : 'Recent'}</Typography>}
                                                        />
                                                        <IconButton size="small" onClick={(e) => handleDeleteConversation(id, e)}>
                                                            <DeleteIcon sx={{ fontSize: 18 }} />
                                                        </IconButton>
                                                    </ListItemButton>
                                                    <Divider />
                                                </React.Fragment>
                                            );
                                        })}
                                    </List>
                                )}
                            </Box>
                        </Paper>
                    </Grid>

                    {/* Right: Message Preview Thread */}
                    <Grid item xs={12} md={7}>
                        <Paper elevation={2} sx={{ height: 600, display: 'flex', flexDirection: 'column' }}>
                            {selectedConv ? (
                                <>
                                    <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Box>
                                            <Typography variant="subtitle1" sx={{ fontWeight: 700 }} noWrap>
                                                {selectedConv.title || 'Conversation Detail'}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                ID: {selectedConv.id || selectedConv._id}
                                            </Typography>
                                        </Box>
                                        <Button
                                            variant="contained"
                                            size="small"
                                            startIcon={<LaunchIcon />}
                                            onClick={() => handleContinueChat(selectedConv.id || selectedConv._id)}
                                        >
                                            Continue Chat
                                        </Button>
                                    </Box>

                                    <Box sx={{ flex: 1, overflowY: 'auto', p: 3, display: 'flex', flexDirection: 'column', gap: 2, bgcolor: 'background.default' }}>
                                        {loadingMessages ? (
                                            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
                                        ) : convMessages.length === 0 ? (
                                            <Box sx={{ textAlign: 'center', p: 4, color: 'text.secondary' }}>
                                                <Typography variant="body2">No messages stored in this thread.</Typography>
                                            </Box>
                                        ) : (
                                            convMessages.map((msg, i) => {
                                                const isUser = msg.role === 'user';
                                                return (
                                                    <Box
                                                        key={msg.id || i}
                                                        sx={{
                                                            alignSelf: isUser ? 'flex-end' : 'flex-start',
                                                            maxWidth: '85%',
                                                            p: 2,
                                                            borderRadius: 2,
                                                            bgcolor: isUser ? 'primary.main' : 'background.paper',
                                                            color: isUser ? 'primary.contrastText' : 'text.primary',
                                                            boxShadow: 1
                                                        }}
                                                    >
                                                        <Typography variant="caption" sx={{ fontWeight: 700, mb: 0.5, display: 'block', opacity: 0.8 }}>
                                                            {isUser ? 'YOU' : 'AI ASSISTANT (Gemini 3.5 Flash Lite)'}
                                                        </Typography>
                                                        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                                                            {msg.content}
                                                        </Typography>
                                                        {msg.sources && msg.sources.length > 0 && (
                                                            <Box sx={{ mt: 1, pt: 1, borderTop: 1, borderColor: 'divider' }}>
                                                                <Typography variant="caption" sx={{ fontWeight: 600 }}>Sources Cited:</Typography>
                                                                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                                                                    {msg.sources.map((s, idx) => {
                                                                        const label = typeof s === 'string' ? s : (s?.title || `Doc ${idx + 1}`);
                                                                        return (
                                                                            <Chip key={idx} size="small" label={label} variant="outlined" sx={{ fontSize: '0.7rem' }} />
                                                                        );
                                                                    })}
                                                                </Box>
                                                            </Box>
                                                        )}
                                                    </Box>
                                                );
                                            })
                                        )}
                                    </Box>
                                </>
                            ) : (
                                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'text.secondary' }}>
                                    <ChatIcon sx={{ fontSize: 60, opacity: 0.2, mb: 1 }} />
                                    <Typography variant="body1">Select a conversation from the left to view the message history.</Typography>
                                </Box>
                            )}
                        </Paper>
                    </Grid>
                </Grid>
            )}

            {/* TAB 1: Audit Activity Log */}
            {activeTab === 1 && (
                <Paper elevation={2} sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                            Security & Access Event Log
                        </Typography>
                        <Button size="small" variant="outlined" startIcon={<DownloadIcon />} onClick={handleExportAudit}>
                            Export JSON
                        </Button>
                    </Box>

                    <TableContainer sx={{ maxHeight: 520 }}>
                        <Table size="small" stickyHeader>
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 600 }}>Timestamp</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Action</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Resource</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>User</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Details</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {filteredLogs.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                                            No audit events match your filter.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredLogs.map((log, index) => (
                                        <TableRow key={log._id || index} hover onClick={() => setSelectedLog(log)} sx={{ cursor: 'pointer' }}>
                                            <TableCell sx={{ fontSize: '0.85rem' }}>
                                                {formatDate(log.timestamp)} {formatTime(log.timestamp)}
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={String(log.action || 'ACTION')}
                                                    size="small"
                                                    color={String(log.action || '').includes('QUERY') ? 'primary' : String(log.action || '').includes('DELETE') ? 'error' : 'default'}
                                                    variant="outlined"
                                                    sx={{ fontSize: '0.75rem' }}
                                                />
                                            </TableCell>
                                            <TableCell sx={{ fontSize: '0.85rem', textTransform: 'capitalize' }}>
                                                {String(log.resourceType || 'system')}
                                            </TableCell>
                                            <TableCell sx={{ fontSize: '0.85rem', fontWeight: 600 }}>
                                                {String(log.username || 'admin')}
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={String(log.status || 'success')}
                                                    size="small"
                                                    color={log.status === 'success' ? 'success' : log.status === 'warning' ? 'warning' : 'error'}
                                                    sx={{ height: 20, fontSize: '0.7rem' }}
                                                />
                                            </TableCell>
                                            <TableCell sx={{ fontSize: '0.8rem', color: 'text.secondary', maxWidth: 250 }} noWrap>
                                                {typeof log.details === 'string' ? log.details : JSON.stringify(log.details || {})}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            )}

            {/* Log Details Dialog */}
            <Dialog open={Boolean(selectedLog)} onClose={() => setSelectedLog(null)} maxWidth="sm" fullWidth>
                <DialogTitle>Audit Log Entry Details</DialogTitle>
                <DialogContent>
                    {selectedLog && (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
                            <Box><Typography variant="caption" color="text.secondary">Action</Typography><Typography variant="body1" sx={{ fontWeight: 600 }}>{String(selectedLog.action || '')}</Typography></Box>
                            <Box><Typography variant="caption" color="text.secondary">Timestamp</Typography><Typography variant="body2">{formatDate(selectedLog.timestamp)} {formatTime(selectedLog.timestamp)}</Typography></Box>
                            <Box><Typography variant="caption" color="text.secondary">User</Typography><Typography variant="body2">{String(selectedLog.username || 'user')} ({typeof selectedLog.userId === 'object' ? (selectedLog.userId?._id || selectedLog.userId?.username || 'user') : String(selectedLog.userId || 'N/A')})</Typography></Box>
                            <Box><Typography variant="caption" color="text.secondary">Status</Typography><Chip label={String(selectedLog.status || 'success')} size="small" color={selectedLog.status === 'success' ? 'success' : 'warning'} sx={{ mt: 0.5 }} /></Box>
                            <Box><Typography variant="caption" color="text.secondary">Raw Details</Typography>
                                <Paper variant="outlined" sx={{ p: 1.5, bgcolor: 'background.default', fontFamily: 'monospace', fontSize: '0.8rem', maxHeight: 200, overflowY: 'auto' }}>
                                    {typeof selectedLog.details === 'string' ? selectedLog.details : JSON.stringify(selectedLog.details, null, 2)}
                                </Paper>
                            </Box>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setSelectedLog(null)}>Close</Button>
                </DialogActions>
            </Dialog>

            {/* Snackbar */}
            <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
                <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
            </Snackbar>
        </Box>
    );
};

export default History;

