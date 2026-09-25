import React, { useState, memo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Avatar,
  IconButton,
  Tooltip,
  Collapse,
  Chip,
  Divider,
  CircularProgress,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  Person as PersonIcon,
  SmartToy as BotIcon,
  ContentCopy as CopyIcon,
  ThumbUp as ThumbUpIcon,
  ThumbDown as ThumbDownIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  MoreVert as MoreVertIcon,
  Security as SecurityIcon,
  Schedule as ScheduleIcon,
  Download as DownloadIcon,
  Share as ShareIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import Citation from './Citation';
import { formatTimestamp, copyToClipboard } from '../../utils/helpers';
import { chatService } from '../../services/chatService';
import { auditService } from '../../services/auditService';

const Message = memo(({
  message,
  isLast = false,
  isStreaming = false,
  onSourceClick,
  onFeedback
}) => {
  const [expanded, setExpanded] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [copied, setCopied] = useState(false);

  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';
  const isSystem = message.role === 'system';

  const handleCopy = async () => {
    const success = await copyToClipboard(message.content);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleFeedback = async (rating) => {
    setFeedback(rating);

    if (onFeedback) {
      onFeedback(message.id, rating);
    }

    // Log feedback
    await auditService.logEvent({
      action: 'CHAT_FEEDBACK',
      resourceType: 'chat',
      resourceId: message.id,
      details: {
        rating,
        messageId: message.id
      },
      status: 'success'
    });
  };

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleExport = () => {
    handleMenuClose();
    // Export message
    const data = {
      id: message.id,
      role: message.role,
      content: message.content,
      timestamp: message.timestamp,
      sources: message.sources || [],
      citations: message.citations || []
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `message-${message.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isSystem) {
    return (
      <Box sx={{
        display: 'flex',
        justifyContent: 'center',
        my: 1
      }}>
        <Chip
          icon={<SecurityIcon />}
          label={message.content}
          size="small"
          variant="outlined"
          color="default"
        />
      </Box>
    );
  }

  return (
    <Box sx={{
      display: 'flex',
      flexDirection: isUser ? 'row-reverse' : 'row',
      alignItems: 'flex-start',
      gap: 1,
      maxWidth: '85%',
      alignSelf: isUser ? 'flex-end' : 'flex-start',
      width: 'fit-content'
    }}>
      {/* Avatar */}
      <Avatar
        sx={{
          width: 32,
          height: 32,
          bgcolor: isUser ? 'primary.main' : 'secondary.main'
        }}
      >
        {isUser ? <PersonIcon /> : <BotIcon />}
      </Avatar>

      {/* Message content */}
      <Box sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 0.5,
        maxWidth: '100%'
      }}>
        <Paper
          elevation={1}
          sx={{
            p: 1.5,
            borderRadius: 2,
            bgcolor: isUser ? 'primary.light' : 'background.paper',
            color: isUser ? 'primary.contrastText' : 'text.primary',
            borderTopLeftRadius: isUser ? 8 : 2,
            borderTopRightRadius: isUser ? 2 : 8,
            position: 'relative'
          }}
        >
          {/* Message text */}
          <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
            {message.content}
            {isStreaming && <CircularProgress size={16} sx={{ ml: 1 }} />}
          </Typography>

          {/* Citations */}
          {message.citations && message.citations.length > 0 && (
            <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {message.citations.map((citation, index) => (
                <Citation key={index} citation={citation} />
              ))}
            </Box>
          )}

          {/* Sources */}
          {message.sources && message.sources.length > 0 && (
            <Box sx={{ mt: 1 }}>
              <Divider sx={{ my: 0.5 }} />
              <Typography variant="caption" color="text.secondary">
                Sources:
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                {message.sources.map((source, index) => (
                  <Chip
                    key={index}
                    label={source.title || `Source ${index + 1}`}
                    size="small"
                    onClick={() => onSourceClick && onSourceClick(source)}
                    clickable
                    variant="outlined"
                  />
                ))}
              </Box>
            </Box>
          )}
        </Paper>

        {/* Metadata */}
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 0.5
        }}>
          <Typography variant="caption" color="text.secondary">
            {formatTimestamp(message.timestamp)}
          </Typography>

          {message.safetyScore && (
            <Tooltip title={`Safety score: ${(message.safetyScore * 100).toFixed(1)}%`}>
              <SecurityIcon sx={{ fontSize: 14, color: 'success.main' }} />
            </Tooltip>
          )}

          {/* Actions */}
          <Box sx={{
            display: 'flex',
            gap: 0.5,
            opacity: 0,
            transition: 'opacity 0.2s',
            '&:hover': { opacity: 1 }
          }}>
            <Tooltip title={copied ? 'Copied!' : 'Copy'}>
              <IconButton size="small" onClick={handleCopy}>
                <CopyIcon sx={{ fontSize: 14 }} />
              </IconButton>
            </Tooltip>

            {isAssistant && (
              <>
                <Tooltip title="Helpful">
                  <IconButton
                    size="small"
                    onClick={() => handleFeedback(5)}
                    color={feedback === 5 ? 'primary' : 'default'}
                  >
                    <ThumbUpIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </Tooltip>

                <Tooltip title="Not helpful">
                  <IconButton
                    size="small"
                    onClick={() => handleFeedback(1)}
                    color={feedback === 1 ? 'error' : 'default'}
                  >
                    <ThumbDownIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </Tooltip>
              </>
            )}

            <Tooltip title="More options">
              <IconButton size="small" onClick={handleMenuOpen}>
                <MoreVertIcon sx={{ fontSize: 14 }} />
              </IconButton>
            </Tooltip>
          </Box>

          {/* Expand/collapse */}
          {(message.sources?.length > 0 || message.metadata) && (
            <Tooltip title={expanded ? 'Show less' : 'Show more'}>
              <IconButton size="small" onClick={() => setExpanded(!expanded)}>
                {expanded ?
                  <ExpandLessIcon sx={{ fontSize: 14 }} /> :
                  <ExpandMoreIcon sx={{ fontSize: 14 }} />
                }
              </IconButton>
            </Tooltip>
          )}
        </Box>

        {/* Expanded content */}
        <Collapse in={expanded}>
          <Paper variant="outlined" sx={{ p: 1, mt: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              Message ID: {message.id}
            </Typography>
            {message.model && (
              <Typography variant="caption" display="block" color="text.secondary">
                Model: {message.model}
              </Typography>
            )}
            {message.tokenUsage && (
              <Typography variant="caption" display="block" color="text.secondary">
                Tokens: {JSON.stringify(message.tokenUsage)}
              </Typography>
            )}
          </Paper>
        </Collapse>
      </Box>

      {/* Message menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleCopy}>
          <ListItemIcon>
            <CopyIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Copy message</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleExport}>
          <ListItemIcon>
            <DownloadIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Export message</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleMenuClose}>
          <ListItemIcon>
            <ShareIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Share</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleMenuClose}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText sx={{ color: 'error.main' }}>Delete</ListItemText>
        </MenuItem>
      </Menu>
    </Box>
  );
});

Message.displayName = 'Message';

export default Message;