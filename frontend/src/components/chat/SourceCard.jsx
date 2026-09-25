import React, { useState, memo } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Tooltip,
  Chip,
  Collapse,
  LinearProgress,
  Rating
} from '@mui/material';
import {
  Article as ArticleIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  OpenInNew as OpenInNewIcon,
  Lock as LockIcon,
  Public as PublicIcon,
  Security as SecurityIcon,
  Download as DownloadIcon
} from '@mui/icons-material';
import { formatTimestamp, getClassificationColor, getClassificationIcon } from '../../utils/helpers';

const SourceCard = memo(({ source, onOpen, onDownload }) => {
  const [expanded, setExpanded] = useState(false);

  const {
    id,
    title,
    classification = 'internal',
    department,
    relevanceScore = 0,
    effectiveScore,
    tags = [],
    metadata = {},
    content,
    createdAt,
    updatedAt
  } = source;

  const score = effectiveScore || relevanceScore;
  const scorePercent = Math.round(score * 100);

  const handleOpen = () => {
    if (onOpen) {
      onOpen(source);
    }
  };

  const handleDownload = () => {
    if (onDownload) {
      onDownload(source);
    }
  };

  const classificationColor = getClassificationColor(classification);
  const ClassificationIcon = getClassificationIcon(classification);

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 1.5,
        cursor: 'pointer',
        '&:hover': {
          bgcolor: 'action.hover'
        }
      }}
      onClick={handleOpen}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
        {/* Document icon */}
        <ArticleIcon sx={{ mt: 0.5, color: 'text.secondary' }} />

        {/* Content */}
        <Box sx={{ flex: 1 }}>
          {/* Title and actions */}
          <Box sx={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between'
          }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              {title || 'Untitled Document'}
            </Typography>

            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <Tooltip title="Open document">
                <IconButton size="small" onClick={handleOpen}>
                  <OpenInNewIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>

              <Tooltip title="Download">
                <IconButton size="small" onClick={handleDownload}>
                  <DownloadIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>

              <Tooltip title={expanded ? 'Show less' : 'Show more'}>
                <IconButton size="small" onClick={() => setExpanded(!expanded)}>
                  {expanded ?
                    <ExpandLessIcon sx={{ fontSize: 16 }} /> :
                    <ExpandMoreIcon sx={{ fontSize: 16 }} />
                  }
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          {/* Metadata */}
          <Box sx={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 0.5,
            mt: 0.5
          }}>
            {/* Classification */}
            <Chip
              icon={<ClassificationIcon />}
              label={classification.toUpperCase()}
              size="small"
              sx={{
                bgcolor: `${classificationColor}.light`,
                color: `${classificationColor}.dark`,
                fontWeight: 600
              }}
            />

            {/* Department */}
            {department && (
              <Chip
                label={department}
                size="small"
                variant="outlined"
              />
            )}

            {/* Tags */}
            {tags.slice(0, 3).map((tag, index) => (
              <Chip
                key={index}
                label={tag}
                size="small"
                variant="outlined"
                sx={{ fontSize: '0.7rem' }}
              />
            ))}
          </Box>

          {/* Relevance score */}
          <Box sx={{ mt: 1 }}>
            <Box sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              mb: 0.5
            }}>
              <Typography variant="caption" color="text.secondary">
                Relevance
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {scorePercent}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={scorePercent}
              sx={{
                height: 4,
                borderRadius: 2,
                bgcolor: 'action.hover'
              }}
            />
          </Box>

          {/* Timestamps */}
          <Box sx={{
            display: 'flex',
            gap: 1,
            mt: 0.5
          }}>
            <Typography variant="caption" color="text.secondary">
              Created: {formatTimestamp(createdAt)}
            </Typography>
            {updatedAt && (
              <Typography variant="caption" color="text.secondary">
                Updated: {formatTimestamp(updatedAt)}
              </Typography>
            )}
          </Box>

          {/* Expanded content */}
          <Collapse in={expanded}>
            <Box sx={{ mt: 1 }}>
              {/* Content preview */}
              {content && (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    maxHeight: 100,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 4,
                    WebkitBoxOrient: 'vertical'
                  }}
                >
                  {content}
                </Typography>
              )}

              {/* Additional metadata */}
              {metadata && Object.keys(metadata).length > 0 && (
                <Box sx={{ mt: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    Metadata:
                  </Typography>
                  <Box sx={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 0.5,
                    mt: 0.5
                  }}>
                    {Object.entries(metadata).slice(0, 5).map(([key, value]) => (
                      <Chip
                        key={key}
                        label={`${key}: ${value}`}
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: '0.65rem' }}
                      />
                    ))}
                  </Box>
                </Box>
              )}
            </Box>
          </Collapse>
        </Box>
      </Box>
    </Paper>
  );
});

SourceCard.displayName = 'SourceCard';

export default SourceCard;