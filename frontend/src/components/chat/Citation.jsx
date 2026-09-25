import React, { useState, memo } from 'react';
import {
  Box,
  Chip,
  Tooltip,
  Popover,
  Typography,
  Paper,
  IconButton
} from '@mui/material';
import {
  FormatQuote as QuoteIcon,
  OpenInNew as OpenInNewIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { formatTimestamp } from '../../utils/helpers';

const Citation = memo(({ citation, onOpen }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [hovered, setHovered] = useState(false);

  const {
    id,
    number,
    document_id: documentId,
    title,
    style = 'inline',
    text,
    relevance_score: relevanceScore,
    metadata = {}
  } = citation;

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleOpenDocument = () => {
    handleClose();
    if (onOpen) {
      onOpen(citation);
    }
  };

  const citationText = text || `[${number}]`;

  return (
    <>
      <Tooltip title={title || `Citation ${number}`}>
        <Chip
          icon={<QuoteIcon sx={{ fontSize: 14 }} />}
          label={citationText}
          size="small"
          onClick={handleClick}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          sx={{
            cursor: 'pointer',
            bgcolor: hovered ? 'primary.light' : 'action.hover',
            '&:hover': {
              bgcolor: 'primary.light'
            }
          }}
        />
      </Tooltip>

      {/* Citation details popover */}
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'center'
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'center'
        }}
      >
        <Paper sx={{ p: 2, maxWidth: 300 }}>
          <Box sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            mb: 1
          }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              {title || `Citation ${number}`}
            </Typography>
            <IconButton size="small" onClick={handleClose}>
              <CloseIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Box>

          {/* Citation details */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {documentId && (
              <Typography variant="caption" color="text.secondary">
                Document ID: {documentId}
              </Typography>
            )}

            {relevanceScore !== undefined && (
              <Typography variant="caption" color="text.secondary">
                Relevance: {(relevanceScore * 100).toFixed(1)}%
              </Typography>
            )}

            {metadata.author && (
              <Typography variant="caption" color="text.secondary">
                Author: {metadata.author}
              </Typography>
            )}

            {metadata.department && (
              <Typography variant="caption" color="text.secondary">
                Department: {metadata.department}
              </Typography>
            )}

            {metadata.classification && (
              <Typography variant="caption" color="text.secondary">
                Classification: {metadata.classification}
              </Typography>
            )}

            {metadata.created_at && (
              <Typography variant="caption" color="text.secondary">
                Created: {formatTimestamp(metadata.created_at)}
              </Typography>
            )}
          </Box>

          {/* Open document button */}
          <Box sx={{ mt: 1, display: 'flex', justifyContent: 'flex-end' }}>
            <Chip
              icon={<OpenInNewIcon />}
              label="Open Document"
              size="small"
              onClick={handleOpenDocument}
              color="primary"
              variant="outlined"
            />
          </Box>
        </Paper>
      </Popover>
    </>
  );
});

Citation.displayName = 'Citation';

export default Citation;