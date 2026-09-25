import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Box,
    Paper,
    Typography,
    IconButton,
    Tooltip,
    Alert,
    List,
    ListItemButton,
    ListItemText,
    ListItemAvatar,
    Avatar,
    Divider,
    CircularProgress,
    Button,
    Badge,
    Tab,
    Tabs
} from '@mui/material';
import {
    Chat as ChatIcon,
    Add as AddIcon,
    Delete as DeleteIcon,
    Security as SecurityIcon,
    Close as CloseIcon,
    Menu as MenuIcon
} from '@mui/icons-material';
import ChatWindow from '../components/chat/ChatWindow';
import { chatService } from '../services/chatService';
import { useAuth } from '../hooks/useAuth';
import { useWebSocket } from '../hooks/useWebSocket';
import { formatDate } from '../utils/helpers';

const Chat = () => {
    const { conversationId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [conversations, setConversations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showHistory, setShowHistory] = useState(true);
    const [activeTab, setActiveTab] = useState(0);
    const [selectedConversation, setSelectedConversation] = useState(conversationId);

    // FIXED: use import.meta.env instead of process.env
    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:5000/ws';
    const { connectionStatus, sendMessage: wsSend } = useWebSocket(wsUrl);

    const fetchConversations = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const result = await chatService.getConversations();
            setConversations(result?.conversations || []);
        } catch (error) {
            console.error('Failed to fetch conversations:', error);
            setError('Failed to load conversations');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchConversations();
    }, [fetchConversations]);

    useEffect(() => {
        if (conversationId) {
            setSelectedConversation(conversationId);
        }
    }, [conversationId]);

    const handleNewConversation = () => {
        const newId = `conv-${Date.now()}`;
        navigate(`/chat/${newId}`);
        setSelectedConversation(newId);
    };

    const handleSelectConversation = (conversation) => {
        const id = conversation.id || conversation._id;
        navigate(`/chat/${id}`);
        setSelectedConversation(id);
    };

    const handleDeleteConversation = async (id) => {
        try {
            await chatService.deleteConversation(id);
            fetchConversations();

            if (selectedConversation === id) {
                navigate('/chat');
                setSelectedConversation(null);
            }
        } catch (error) {
            console.error('Failed to delete conversation:', error);
        }
    };

    const handleTabChange = (event, newValue) => {
        setActiveTab(newValue);
    };

    return (
        <Box sx={{
            height: 'calc(100vh - 64px)',
            display: 'flex',
            overflow: 'hidden'
        }}>
            {/* Conversation History Sidebar */}
            {showHistory && (
                <Paper
                    elevation={1}
                    sx={{
                        width: 300,
                        minWidth: 300,
                        display: 'flex',
                        flexDirection: 'column',
                        borderRight: 1,
                        borderColor: 'divider'
                    }}
                >
                    <Box sx={{
                        p: 2,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderBottom: 1,
                        borderColor: 'divider'
                    }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                            Conversations
                        </Typography>

                        <Box>
                            <Tooltip title="New Conversation">
                                <IconButton size="small" onClick={handleNewConversation}>
                                    <AddIcon />
                                </IconButton>
                            </Tooltip>
                            <Tooltip title="Hide History">
                                <IconButton size="small" onClick={() => setShowHistory(false)}>
                                    <CloseIcon />
                                </IconButton>
                            </Tooltip>
                        </Box>
                    </Box>

                    <Tabs
                        value={activeTab}
                        onChange={handleTabChange}
                        sx={{ borderBottom: 1, borderColor: 'divider' }}
                    >
                        <Tab label="Recent" />
                        <Tab label="Saved" />
                    </Tabs>

                    <Box sx={{ flex: 1, overflow: 'auto' }}>
                        {loading ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                                <CircularProgress />
                            </Box>
                        ) : conversations.length === 0 ? (
                            <Box sx={{ p: 3, textAlign: 'center' }}>
                                <ChatIcon sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }} />
                                <Typography variant="body2" color="text.secondary">
                                    No conversations yet
                                </Typography>
                                <Button
                                    variant="outlined"
                                    size="small"
                                    onClick={handleNewConversation}
                                    sx={{ mt: 1 }}
                                >
                                    Start New
                                </Button>
                            </Box>
                        ) : (
                            <List>
                                {conversations.map((conversation) => {
                                    const id = conversation.id || conversation._id;
                                    return (
                                        <React.Fragment key={id}>
                                            <ListItemButton
                                                selected={selectedConversation === id}
                                                onClick={() => handleSelectConversation(conversation)}
                                                sx={{
                                                    '&.Mui-selected': {
                                                        bgcolor: 'action.selected',
                                                        borderLeft: 3,
                                                        borderColor: 'primary.main'
                                                    }
                                                }}
                                            >
                                                <ListItemAvatar>
                                                    <Avatar sx={{ bgcolor: 'primary.main' }}>
                                                        <ChatIcon />
                                                    </Avatar>
                                                </ListItemAvatar>

                                                <ListItemText
                                                    primary={
                                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                            {conversation.title || 'Untitled'}
                                                        </Typography>
                                                    }
                                                    secondary={
                                                        <Typography variant="caption" color="text.secondary">
                                                            {conversation.updatedAt ? formatDate(conversation.updatedAt) : 'New'}
                                                        </Typography>
                                                    }
                                                />

                                                <IconButton
                                                    size="small"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteConversation(id);
                                                    }}
                                                >
                                                    <DeleteIcon sx={{ fontSize: 16 }} />
                                                </IconButton>
                                            </ListItemButton>
                                            <Divider />
                                        </React.Fragment>
                                    );
                                })}
                            </List>
                        )}
                    </Box>

                    <Box sx={{
                        p: 1,
                        borderTop: 1,
                        borderColor: 'divider',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <Badge
                            color={connectionStatus === 'connected' ? 'success' : 'error'}
                            variant="dot"
                            sx={{ mr: 1 }}
                        >
                            <SecurityIcon />
                        </Badge>
                        <Typography variant="caption" color="text.secondary">
                            {connectionStatus === 'connected' ? 'Connected' : 'Disconnected'}
                        </Typography>
                    </Box>
                </Paper>
            )}

            {/* Main Chat Area */}
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                {!showHistory && (
                    <Box sx={{
                        p: 1,
                        borderBottom: 1,
                        borderColor: 'divider',
                        display: 'flex',
                        alignItems: 'center'
                    }}>
                        <Tooltip title="Show History">
                            <IconButton size="small" onClick={() => setShowHistory(true)}>
                                <MenuIcon />
                            </IconButton>
                        </Tooltip>
                        <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                            History hidden
                        </Typography>
                    </Box>
                )}

                {error && (
                    <Alert severity="error" sx={{ m: 1 }} onClose={() => setError(null)}>
                        {error}
                    </Alert>
                )}

                <ChatWindow
                    conversationId={selectedConversation}
                    onConversationChange={setSelectedConversation}
                />
            </Box>
        </Box>
    );
};

export default Chat;