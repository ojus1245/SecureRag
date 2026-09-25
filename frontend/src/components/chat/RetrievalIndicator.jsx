import React, { useState, useEffect, memo } from 'react';
import {
  Box,
  Paper,
  Typography,
  LinearProgress,
  Chip,
  IconButton,
  Collapse,
  Tooltip,
  CircularProgress
} from '@mui/material';
import {
  Search as SearchIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Schedule as ScheduleIcon,
  Storage as StorageIcon,
  Security as SecurityIcon
} from '@mui/icons-material';
import { formatDuration } from '../../utils/helpers';

const RetrievalIndicator = memo(({ status }) => {
  const [expanded, setExpanded] = useState(false);
  const [progress, setProgress] = useState(0);

  const {
    status: retrievalStatus = 'retrieving',
    message = 'Retrieving documents...',
    documentsRetrieved = 0,
    totalCandidates = 0,
    retrievalTime,
    method,
    documents = []
  } = status;

  // Simulate progress
  useEffect(() => {
    if (retrievalStatus === 'retrieving') {
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            clearInterval(interval);
            return prev;
          }
          return prev + 10;
        });
      }, 200);

      return () => clearInterval(interval);
    } else if (retrievalStatus === 'completed') {
      setProgress(100);
    } else if (retrievalStatus === 'failed') {
      setProgress(0);
    }
  }, [retrievalStatus]);

  const getStatusIcon = () => {
    switch (retrievalStatus) {
      case 'retrieving':
        return <CircularProgress size={16} />;
      case 'completed':
        return <CheckCircleIcon sx={{ color: 'success.main', fontSize: 16 }} />;
      case 'failed':
        return <ErrorIcon sx={{ color: 'error.main', fontSize: 16 }} />;
      default:
        return <SearchIcon sx={{ fontSize: 16 }} />;
    }
  };

  const getStatusColor = () => {
    switch (retrievalStatus) {
      case 'retrieving':
        return 'primary';
      case 'completed':
        return 'success';
      case 'failed':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 1,
        bgcolor: 'background.paper',
        borderLeft: 4,
        borderColor: `${getStatusColor()}.main`
      }}
    >
      {/* Header */}
      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1
      }}>
        {getStatusIcon()}

        <Typography variant="body2" sx={{ flex: 1 }}>
          {message}
        </Typography>

        {/* Statistics */}
        <Box sx={{ display: 'flex', gap: 1 }}>
          {documentsRetrieved > 0 && (
            <Chip
              icon={<StorageIcon sx={{ fontSize: 14 }} />}
              label={`${documentsRetrieved}/${totalCandidates}`}
              size="small"
              variant="outlined"
            />
          )}

          {retrievalTime && (
            <Chip
              icon={<ScheduleIcon sx={{ fontSize: 14 }} />}
              label={formatDuration(retrievalTime)}
              size="small"
              variant="outlined"
            />
          )}

          {method && (
            <Chip
              icon={<SearchIcon sx={{ fontSize: 14 }} />}
              label={method}
              size="small"
              variant="outlined"
            />
          )}

          {/* Expand toggle */}
          <Tooltip title={expanded ? 'Show less' : 'Show details'}>
            <IconButton size="small" onClick={() => setExpanded(!expanded)}>
              {expanded ?
                <ExpandLessIcon sx={{ fontSize: 16 }} /> :
                <ExpandMoreIcon sx={{ fontSize: 16 }} />
              }
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Progress bar */}
      {retrievalStatus === 'retrieving' && (
        <LinearProgress
          variant="determinate"
          value={progress}
          sx={{ mt: 1, height: 3, borderRadius: 1.5 }}
        />
      )}

      {/* Expanded details */}
      <Collapse in={expanded}>
        <Box sx={{ mt: 1 }}>
          {/* Retrieved documents */}
          {documents.length > 0 && (
            <Box sx={{ mb: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Retrieved Documents:
              </Typography>
              <Box sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 0.5,
                mt: 0.5
              }}>
                {documents.map((doc, index) => (
                  <Box
                    key={index}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      p: 0.5,
                      bgcolor: 'action.hover',
                      borderRadius: 1
                    }}
                  >
                    <SecurityIcon sx={{ fontSize: 12, color: 'text.secondary' }} />
                    <Typography variant="caption" sx={{ flex: 1 }}>
                      {doc.title || `Document ${index + 1}`}
                    </Typography>
                    {doc.score && (
                      <Typography variant="caption" color="text.secondary">
                        {(doc.score * 100).toFixed(1)}%
                      </Typography>
                    )}
                  </Box>
                ))}
              </Box>
            </Box>
          )}

          {/* Retrieval details */}
          <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 0.5,
            p: 1,
            bgcolor: 'action.hover',
            borderRadius: 1
          }}>
            <Typography variant="caption" color="text.secondary">
              Status: {retrievalStatus}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Method: {method || 'N/A'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Candidates: {totalCandidates}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Retrieved: {documentsRetrieved}
            </Typography>
            {retrievalTime && (
              <Typography variant="caption" color="text.secondary">
                Time: {formatDuration(retrievalTime)}
              </Typography>
            )}
          </Box>
        </Box>
      </Collapse>
    </Paper>
  );
});

RetrievalIndicator.displayName = 'RetrievalIndicator';

export default RetrievalIndicator;