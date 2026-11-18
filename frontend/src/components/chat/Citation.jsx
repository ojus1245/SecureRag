import React, { useState, memo } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState(null);
  const [hovered, setHovered] = useState(false);

  const {
    id,
    number,
    document_id,
    documentId: rawDocId,
    title,
    style = 'inline',
    text,
    snippet,
    relevance_score,
    relevanceScore: rawRelScore,
    metadata = {}
  } = citation;

  const docId = document_id || rawDocId || (metadata && metadata.documentId);
  const relevance = relevance_score !== undefined ? relevance_score : rawRelScore;

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
    } else if (docId) {
      navigate(`/documents/${docId}`, {
        state: {
          highlightText: snippet || text || title,
          snippet: snippet
        }
      });
    }
  };

  const citationText = text || title || `[${number}]`;

  return (
    <>
      <Tooltip title={`Click to inspect citation & jump to direct mention in: ${title || 'Document'}`}>
        <Chip
          icon={<QuoteIcon sx={{ fontSize: 14 }} />}
          label={citationText}
          size="small"
          onClick={handleClick}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          sx={{
            cursor: 'pointer',
            maxWidth: 260,
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
        <Paper sx={{ p: 2, maxWidth: 360 }}>
          <Box sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            mb: 1
          }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'primary.main' }}>
              {title || `Citation ${number}`}
            </Typography>
            <IconButton size="small" onClick={handleClose}>
              <CloseIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Box>

          {/* Direct Mention snippet if available */}
          {snippet && (
            <Paper
              variant="outlined"
              sx={{
                p: 1.5,
                mb: 1.5,
                bgcolor: 'background.default',
                borderLeft: 3,
                borderColor: 'primary.main',
                fontStyle: 'italic',
                fontSize: '0.8rem',
                lineHeight: 1.5
              }}
            >
              "{snippet}"
            </Paper>
          )}

          {/* Citation details */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {docId && (
              <Typography variant="caption" color="text.secondary">
                Document ID: {docId}
              </Typography>
            )}

            {relevance !== undefined && (
              <Typography variant="caption" sx={{ fontWeight: 600, color: 'success.main' }}>
                Relevance Confidence: {(relevance * 100).toFixed(1)}%
              </Typography>
            )}

            {metadata.department && (
              <Typography variant="caption" color="text.secondary">
                Department: {metadata.department}
              </Typography>
            )}

            {metadata.classification && (
              <Typography variant="caption" color="text.secondary">
                Classification: {metadata.classification.toUpperCase()}
              </Typography>
            )}

            {metadata.created_at && (
              <Typography variant="caption" color="text.secondary">
                Indexed: {formatTimestamp(metadata.created_at)}
              </Typography>
            )}
          </Box>

          {/* Open document button */}
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
            <Chip
              icon={<OpenInNewIcon />}
              label="Go to Direct Mention in Document"
              size="small"
              onClick={handleOpenDocument}
              color="primary"
              variant="filled"
              clickable
              sx={{ fontWeight: 600 }}
            />
          </Box>
        </Paper>
      </Popover>
    </>
  );
});

Citation.displayName = 'Citation';

export default Citation;
