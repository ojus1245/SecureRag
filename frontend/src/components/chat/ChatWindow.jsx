import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Tooltip,
  Badge,
  Drawer,
  Divider,
  CircularProgress,
  Alert,
  Snackbar,
  Avatar,
  Chip
} from '@mui/material';
import {
  History as HistoryIcon,
  Security as SecurityIcon,
  ClearAll as ClearAllIcon,
  Download as DownloadIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import ChatInput from './ChatInput';
import Message from './Message';
import SourceCard from './SourceCard';
import RetrievalIndicator from './RetrievalIndicator';
import { chatService } from '../../services/chatService';
import { auditService } from '../../services/auditService';
import { useChat } from '../../hooks/useChat';
import { useAuth } from '../../hooks/useAuth';
import { useWebSocket } from '../../hooks/useWebSocket';

const ChatWindow = ({ conversationId, onConversationChange }) => {
  const { user } = useAuth();
  const {
    messages,
    isLoading,
    error,
    isStreaming,
    sources,
    sendMessage,
    clearMessages,
    exportConversation
  } = useChat(conversationId);

  const [inputValue, setInputValue] = useState('');
  const [showSources, setShowSources] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const [isTyping, setIsTyping] = useState(false);
  const [retrievalStatus, setRetrievalStatus] = useState(null);
  const [safetyCheck, setSafetyCheck] = useState(null);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // FIXED: Use import.meta.env instead of process.env
  const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:5000/ws';
  const { connectionStatus, subscribe } = useWebSocket(wsUrl);

  // Auto-scroll to bottom
  useEffect(() => {
    scrollToBottom();
  }, [messages, isStreaming]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (conversationId && subscribe) {
      const unsubscribe = subscribe(`conversation:${conversationId}`, (data) => {
        if (data.type === 'retrieval_status') {
          setRetrievalStatus(data);
        } else if (data.type === 'safety_check') {
          setSafetyCheck(data);
        }
      });

      return () => {
        if (typeof unsubscribe === 'function') {
          unsubscribe();
        }
      };
    }
  }, [conversationId, subscribe]);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  };

  const handleSendMessage = async (content, attachments = []) => {
    if (!content.trim() && attachments.length === 0) return;

    setInputValue('');
    setIsTyping(true);
    setRetrievalStatus({ status: 'retrieving', message: 'Searching documents...' });

    try {
      // Safety check
      const safetyResult = await chatService.checkSafety(content);
      setSafetyCheck(safetyResult);

      if (!safetyResult.safe) {
        setSnackbar({
          open: true,
          message: `Message blocked: ${safetyResult.reason}`,
          severity: 'warning'
        });
        setIsTyping(false);
        setRetrievalStatus(null);
        return;
      }

      await sendMessage(content, attachments);

      await auditService.logEvent({
        action: 'CHAT_QUERY',
        resourceType: 'chat',
        details: {
          conversationId,
          queryLength: content.length
        },
        status: 'success'
      });
    } catch (error) {
      console.error('Failed to send message:', error);
      setSnackbar({
        open: true,
        message: 'Failed to send message. Please try again.',
        severity: 'error'
      });
    } finally {
      setIsTyping(false);
      setRetrievalStatus(null);
    }
  };

  const handleClearConversation = async () => {
    try {
      await clearMessages();
      setSnackbar({
        open: true,
        message: 'Conversation cleared',
        severity: 'info'
      });
    } catch (error) {
      console.error('Failed to clear conversation:', error);
    }
  };

  const handleExportConversation = async () => {
    try {
      const exportData = await exportConversation();
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `conversation-${conversationId}.json`;
      a.click();
      URL.revokeObjectURL(url);

      setSnackbar({
        open: true,
        message: 'Conversation exported',
        severity: 'success'
      });
    } catch (error) {
      console.error('Failed to export conversation:', error);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  return (
    <Box sx={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      position: 'relative'
    }}>
      {/* Header */}
      <Paper
        elevation={2}
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          bgcolor: 'background.paper',
          borderBottom: 1,
          borderColor: 'divider'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SecurityIcon color="primary" />
          <Typography variant="h6" component="h2">
            Privacy-Aware RAG Chat
          </Typography>
          {user?.securityClearance && (
            <Chip
              label={user.securityClearance.toUpperCase()}
              size="small"
              color={user.securityClearance === 'restricted' ? 'error' : 'primary'}
              variant="outlined"
              sx={{ ml: 1 }}
            />
          )}
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Toggle sources">
            <IconButton onClick={() => setShowSources(!showSources)}>
              <Badge badgeContent={sources.length} color="primary">
                <InfoIcon />
              </Badge>
            </IconButton>
          </Tooltip>

          <Tooltip title="Conversation history">
            <IconButton onClick={() => setShowHistory(!showHistory)}>
              <HistoryIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title="Export conversation">
            <IconButton onClick={handleExportConversation}>
              <DownloadIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title="Clear conversation">
            <IconButton onClick={handleClearConversation}>
              <ClearAllIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Paper>

      {/* Connection status */}
      {connectionStatus && connectionStatus !== 'connected' && (
        <Alert severity="warning" sx={{ m: 1 }}>
          Connection status: {connectionStatus}
        </Alert>
      )}

      {/* Error display */}
      {error && (
        <Alert severity="error" sx={{ m: 1 }}>
          {error}
        </Alert>
      )}

      {/* Safety check result */}
      {safetyCheck && !safetyCheck.safe && (
        <Alert severity="warning" sx={{ m: 1 }}>
          Safety: {safetyCheck.reason || 'Message flagged'}
        </Alert>
      )}

      {/* Messages area */}
      <Box sx={{
        flex: 1,
        overflow: 'auto',
        p: 2,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        bgcolor: 'background.default'
      }}>
        {messages.length === 0 && !isLoading ? (
          <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: 'text.secondary'
          }}>
            <SecurityIcon sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
            <Typography variant="h6">
              Start a secure conversation
            </Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              Your queries are encrypted and privacy-protected
            </Typography>
          </Box>
        ) : (
          messages.map((message, index) => (
            <Message
              key={message.id || `msg-${index}`}
              message={message}
              isLast={index === messages.length - 1}
              isStreaming={isStreaming && index === messages.length - 1}
              onSourceClick={() => {}}
            />
          ))
        )}

        {isLoading && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CircularProgress size={20} />
            <Typography variant="body2" color="text.secondary">
              Generating response...
            </Typography>
          </Box>
        )}

        {retrievalStatus && (
          <RetrievalIndicator status={retrievalStatus} />
        )}

        {isTyping && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Avatar sx={{ width: 24, height: 24 }}>AI</Avatar>
            <Typography variant="body2" color="text.secondary">
              Processing...
            </Typography>
          </Box>
        )}

        <div ref={messagesEndRef} />
      </Box>

      {/* Sources */}
      {showSources && sources.length > 0 && (
        <Paper
          elevation={2}
          sx={{
            maxHeight: 200,
            overflow: 'auto',
            borderTop: 1,
            borderColor: 'divider'
          }}
        >
          <Box sx={{ p: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Sources ({sources.length})
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {sources.map((source, index) => (
                <SourceCard key={source.id || `source-${index}`} source={source} />
              ))}
            </Box>
          </Box>
        </Paper>
      )}

      {/* Input area */}
      <ChatInput
        value={inputValue}
        onChange={setInputValue}
        onSend={handleSendMessage}
        disabled={isLoading || isStreaming}
        placeholder="Ask a question about your documents..."
        ref={inputRef}
        onAttachment={() => {}}
      />

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* History drawer */}
      <Drawer
        anchor="right"
        open={showHistory}
        onClose={() => setShowHistory(false)}
      >
        <Box sx={{ width: 300, p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Conversation History
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <Typography variant="body2" color="text.secondary">
            No history available
          </Typography>
        </Box>
      </Drawer>
    </Box>
  );
};

export default ChatWindow;