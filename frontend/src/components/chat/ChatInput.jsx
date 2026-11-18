import React, { useState, useRef, forwardRef, useImperativeHandle } from 'react';
import {
  Box,
  Paper,
  TextField,
  IconButton,
  Tooltip,
  Popover,
  Typography,
  Chip,
  CircularProgress,
  Badge,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  Send as SendIcon,
  AttachFile as AttachFileIcon,
  Security as SecurityIcon,
  Code as CodeIcon,
  FormatBold as BoldIcon,
  FormatItalic as ItalicIcon,
  Link as LinkIcon,
  Image as ImageIcon,
  Mic as MicIcon,
  Stop as StopIcon,
  Clear as ClearIcon,
  ExpandLess as ExpandLessIcon
} from '@mui/icons-material';
import { useAuth } from '../../hooks/useAuth';
import { chatService } from '../../services/chatService';

const ChatInput = forwardRef(({
  value,
  onChange,
  onSend,
  disabled = false,
  placeholder = 'Type your message...',
  maxLength = 4000,
  onAttachment,
  showSecurityBadge = true
}, ref) => {
  const { user } = useAuth();
  const [attachments, setAttachments] = useState([]);
  const [isFocused, setIsFocused] = useState(false);
  const [charCount, setCharCount] = useState(0);
  const [anchorEl, setAnchorEl] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);
  const textFieldRef = useRef(null);

  useImperativeHandle(ref, () => ({
    focus: () => textFieldRef.current?.focus(),
    clear: () => {
      onChange('');
      setAttachments([]);
    }
  }));

  const handleChange = (e) => {
    const newValue = e.target.value;
    if (newValue.length <= maxLength) {
      onChange(newValue);
      setCharCount(newValue.length);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    if (value.trim() || attachments.length > 0) {
      onSend(value, attachments);
      onChange('');
      setAttachments([]);
      setCharCount(0);
    }
  };

  const handleAttachmentClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleAttachmentClose = () => {
    setAnchorEl(null);
  };

  const handleFileSelect = (type) => {
    handleAttachmentClose();
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files);

    if (files.length === 0) return;

    setIsUploading(true);

    try {
      // Upload files
      const uploadedFiles = await Promise.all(
        files.map(async (file) => {
          // Check file size (10MB limit)
          if (file.size > 10 * 1024 * 1024) {
            throw new Error(`File ${file.name} exceeds 10MB limit`);
          }

          // Upload file
          const result = await chatService.uploadAttachment(file);
          return {
            id: result.id,
            name: file.name,
            type: file.type,
            size: file.size,
            url: result.url
          };
        })
      );

      setAttachments([...attachments, ...uploadedFiles]);
      if (onAttachment) {
        onAttachment(uploadedFiles);
      }
    } catch (error) {
      console.error('Failed to upload attachment:', error);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveAttachment = (attachmentId) => {
    setAttachments(attachments.filter(a => a.id !== attachmentId));
  };

  const handleMicClick = () => {
    // Voice input functionality
    if ('webkitSpeechRecognition' in window) {
      const recognition = new window.webkitSpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        onChange(value + transcript);
      };

      recognition.start();
    }
  };

  return (
    <Paper
      elevation={3}
      sx={{
        p: 2,
        borderTop: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper'
      }}
    >
      {/* Attachments display */}
      {attachments.length > 0 && (
        <Box sx={{ mb: 1, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {attachments.map((attachment) => (
            <Chip
              key={attachment.id}
              label={attachment.name}
              onDelete={() => handleRemoveAttachment(attachment.id)}
              size="small"
              variant="outlined"
            />
          ))}
        </Box>
      )}

      {/* Input area */}
      <Box sx={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: 1,
        position: 'relative'
      }}>
        {/* Attachment button */}
        <Tooltip title="Attach file">
          <IconButton
            onClick={handleAttachmentClick}
            disabled={disabled || isUploading}
            size="small"
          >
            {isUploading ? <CircularProgress size={20} /> : <AttachFileIcon />}
          </IconButton>
        </Tooltip>

        {/* Text input */}
        <TextField
          ref={textFieldRef}
          fullWidth
          multiline
          minRows={1}
          maxRows={6}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          disabled={disabled}
          variant="outlined"
          size="small"
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
              bgcolor: isFocused ? 'action.hover' : 'background.default'
            }
          }}
        />

        {/* Security badge */}
        {showSecurityBadge && user?.securityClearance && (
          <Tooltip title={`Security Clearance: ${user.securityClearance.toUpperCase()} (Highest Access Tier)`}>
            <SecurityIcon
              sx={{
                alignSelf: 'center',
                color: 'success.main',
                fontSize: 20
              }}
            />
          </Tooltip>
        )}

        {/* Voice input */}
        <Tooltip title="Voice input">
          <IconButton
            onClick={handleMicClick}
            disabled={disabled}
            size="small"
          >
            <MicIcon />
          </IconButton>
        </Tooltip>

        {/* Send button */}
        <IconButton
          onClick={handleSend}
          disabled={disabled || (!value.trim() && attachments.length === 0)}
          color="primary"
          sx={{
            bgcolor: 'primary.main',
            color: 'white',
            '&:hover': {
              bgcolor: 'primary.dark'
            },
            '&.Mui-disabled': {
              bgcolor: 'action.disabledBackground',
              color: 'action.disabled'
            }
          }}
        >
          <SendIcon />
        </IconButton>
      </Box>

      {/* Character count */}
      {(isFocused || charCount > 0) && (
        <Box sx={{
          display: 'flex',
          justifyContent: 'flex-end',
          mt: 0.5
        }}>
          <Typography variant="caption" color="text.secondary">
            {charCount}/{maxLength}
          </Typography>
        </Box>
      )}

      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        style={{ display: 'none' }}
        multiple
        accept=".pdf,.doc,.docx,.txt,.md,.html,.json,.png,.jpg,.jpeg,.gif"
      />

      {/* Attachment menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleAttachmentClose}
      >
        <MenuItem onClick={() => handleFileSelect('file')}>
          <ListItemIcon>
            <AttachFileIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Upload file</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleFileSelect('image')}>
          <ListItemIcon>
            <ImageIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Upload image</ListItemText>
        </MenuItem>
      </Menu>
    </Paper>
  );
});

ChatInput.displayName = 'ChatInput';

export default ChatInput;