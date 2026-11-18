import React, { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Avatar,
  LinearProgress,
  Chip,
  IconButton,
  Divider,
  CircularProgress,
  Tooltip,
  Paper
} from '@mui/material';
import {
  Chat as ChatIcon,
  Description as DocumentIcon,
  Security as SecurityIcon,
  TrendingUp as TrendingUpIcon,
  AccessTime as TimeIcon,
  ArrowForward as ArrowForwardIcon,
  Shield as ShieldIcon,
  Storage as StorageIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  SmartToy as SmartToyIcon
} from '@mui/icons-material';
import { documentService } from '../services/documentService';
import { auditService } from '../services/auditService';
import { chatService } from '../services/chatService';
import { formatDate, formatTime, formatFileSize } from '../utils/helpers';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useSelector(state => state.auth);

  const [loading, setLoading] = useState(true);
  const [docStats, setDocStats] = useState(null);
  const [auditStats, setAuditStats] = useState(null);
  const [recentLogs, setRecentLogs] = useState([]);
  const [conversations, setConversations] = useState([]);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const [docsRes, auditRes, logsRes, convsRes] = await Promise.allSettled([
        documentService.getDocumentStats(),
        auditService.getAuditStats(),
        auditService.getAuditLogs({ limit: 5, page: 1, sortBy: 'timestamp', sortOrder: 'desc' }),
        chatService.getConversations(1, 10)
      ]);

      if (docsRes.status === 'fulfilled') setDocStats(docsRes.value);
      if (auditRes.status === 'fulfilled') setAuditStats(auditRes.value);
      if (logsRes.status === 'fulfilled') setRecentLogs(logsRes.value?.logs || []);
      if (convsRes.status === 'fulfilled') setConversations(convsRes.value?.conversations || []);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Dynamic values
  const totalConvs = conversations.length || 0;
  const totalDocs = docStats?.totalDocuments ?? 0;
  const totalLogs = auditStats?.summary?.totalLogs || recentLogs.length || 0;
  const successLogs = auditStats?.summary?.successCount || totalLogs;
  const securityScore = totalLogs > 0 ? Math.round((successLogs / totalLogs) * 100) : 100;

  // Today's queries count from conversations or recent logs
  const todayQueries = recentLogs.filter(l => {
    if (l.action !== 'CHAT_QUERY' && l.action !== 'AUTHENTICATE') return false;
    const logDate = new Date(l.timestamp);
    const today = new Date();
    return logDate.toDateString() === today.toDateString();
  }).length || totalConvs;

  const stats = [
    {
      title: 'Active Conversations',
      value: totalConvs,
      change: `${totalConvs} recorded`,
      icon: <ChatIcon />,
      color: '#6366f1',
      bgColor: 'rgba(99,102,241,0.1)',
      onClick: () => navigate('/history')
    },
    {
      title: 'Knowledge Base Documents',
      value: totalDocs,
      change: formatFileSize(docStats?.totalSize || 0),
      icon: <DocumentIcon />,
      color: '#10b981',
      bgColor: 'rgba(16,185,129,0.1)',
      onClick: () => navigate('/documents')
    },
    {
      title: 'Security Compliance',
      value: `${securityScore}%`,
      change: 'Active Gate',
      icon: <SecurityIcon />,
      color: '#f59e0b',
      bgColor: 'rgba(245,158,11,0.1)',
      onClick: () => navigate('/analytics')
    },
    {
      title: 'Audit & Query Events',
      value: totalLogs,
      change: 'Verified',
      icon: <TrendingUpIcon />,
      color: '#ec4899',
      bgColor: 'rgba(236,72,153,0.1)',
      onClick: () => navigate('/analytics')
    }
  ];

  // Storage calculation: max 100 MB quota for current tier
  const storageBytes = docStats?.totalSize || 0;
  const storageMB = (storageBytes / (1024 * 1024)).toFixed(2);
  const storageQuotaMB = 100;
  const storagePercent = Math.min(Math.round((storageBytes / (storageQuotaMB * 1024 * 1024)) * 100), 100);

  const displayName = user?.fullName || user?.username || 'Administrator';

  return (
    <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto' }}>
      {/* Welcome Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            Welcome back, {displayName} 👋
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Enterprise Privacy-Aware Knowledge Base Overview & Security Telemetry
          </Typography>
        </Box>
        <Tooltip title="Refresh Dashboard">
          <IconButton onClick={fetchDashboardData} disabled={loading} color="primary" sx={{ border: 1, borderColor: 'divider' }}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {loading && <LinearProgress sx={{ mb: 3 }} />}

      {/* Dynamic Stats Grid */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {stats.map((stat, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card
              onClick={stat.onClick}
              sx={{
                height: '100%',
                cursor: 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 12px 24px rgba(0,0,0,0.1)'
                }
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Avatar sx={{ bgcolor: stat.bgColor, color: stat.color, width: 48, height: 48 }}>
                    {stat.icon}
                  </Avatar>
                  <Chip
                    label={stat.change}
                    size="small"
                    sx={{
                      bgcolor: 'rgba(16,185,129,0.1)',
                      color: '#10b981',
                      fontWeight: 600,
                      fontSize: '0.75rem'
                    }}
                  />
                </Box>
                <Typography variant="h4" fontWeight={700}>
                  {stat.value}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {stat.title}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Content Section */}
      <Grid container spacing={3}>
        {/* Quick Actions & System Telemetry */}
        <Grid item xs={12} md={7}>
          <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ flex: 1 }}>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Quick Actions
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<ChatIcon />}
                    endIcon={<ArrowForwardIcon />}
                    onClick={() => navigate('/chat')}
                    sx={{
                      py: 1.8,
                      justifyContent: 'flex-start',
                      borderRadius: 2,
                      textAlign: 'left'
                    }}
                  >
                    New Chat
                  </Button>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<DocumentIcon />}
                    endIcon={<ArrowForwardIcon />}
                    onClick={() => navigate('/documents')}
                    sx={{
                      py: 1.8,
                      justifyContent: 'flex-start',
                      borderRadius: 2,
                      textAlign: 'left'
                    }}
                  >
                    Manage Docs
                  </Button>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<ShieldIcon />}
                    endIcon={<ArrowForwardIcon />}
                    onClick={() => navigate('/analytics')}
                    sx={{
                      py: 1.8,
                      justifyContent: 'flex-start',
                      borderRadius: 2,
                      textAlign: 'left'
                    }}
                  >
                    Analytics
                  </Button>
                </Grid>
              </Grid>

              {/* Dynamic System Telemetry */}
              <Box sx={{ mt: 4 }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Live System Telemetry
                </Typography>

                <Box sx={{ mb: 2.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2">Encrypted Storage Consumed</Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {formatFileSize(storageBytes)} / {storageQuotaMB} MB ({storagePercent}%)
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={Math.max(storagePercent, 2)}
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      bgcolor: 'rgba(99,102,241,0.1)',
                      '& .MuiLinearProgress-bar': { bgcolor: '#6366f1', borderRadius: 4 }
                    }}
                  />
                </Box>

                <Box sx={{ mb: 2.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2">RAG AI Engine</Typography>
                    <Typography variant="body2" fontWeight={600} color="primary.main">
                      Google Gemini 3.5 Flash Lite (Active)
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={100}
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      bgcolor: 'rgba(16,185,129,0.1)',
                      '& .MuiLinearProgress-bar': { bgcolor: '#10b981', borderRadius: 4 }
                    }}
                  />
                </Box>

                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2">Security Policy Compliance Rate</Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {securityScore}% ({successLogs} / {totalLogs} events)
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={securityScore}
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      bgcolor: 'rgba(245,158,11,0.1)',
                      '& .MuiLinearProgress-bar': { bgcolor: '#f59e0b', borderRadius: 4 }
                    }}
                  />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Live Recent Activity */}
        <Grid item xs={12} md={5}>
          <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="h6" fontWeight={600}>
                  Live Audit Activity
                </Typography>
                <Button size="small" onClick={() => navigate('/history')}>
                  View All
                </Button>
              </Box>
              <Divider sx={{ mb: 2 }} />

              {recentLogs.length === 0 ? (
                <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
                  <Typography variant="body2">No recent events recorded</Typography>
                </Box>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, flex: 1 }}>
                  {recentLogs.map((log, index) => {
                    const isChat = log.action === 'CHAT_QUERY';
                    const isDoc = log.action.includes('DOCUMENT');
                    return (
                      <Box
                        key={log._id || index}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1.5,
                          p: 1.2,
                          borderRadius: 1.5,
                          bgcolor: 'action.hover'
                        }}
                      >
                        <Avatar
                          sx={{
                            width: 34,
                            height: 34,
                            bgcolor: isChat
                              ? 'rgba(99,102,241,0.15)'
                              : isDoc
                              ? 'rgba(16,185,129,0.15)'
                              : 'rgba(245,158,11,0.15)',
                            color: isChat ? '#6366f1' : isDoc ? '#10b981' : '#f59e0b'
                          }}
                        >
                          {isChat ? <ChatIcon fontSize="small" /> : isDoc ? <DocumentIcon fontSize="small" /> : <SecurityIcon fontSize="small" />}
                        </Avatar>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="body2" fontWeight={600} noWrap>
                            {log.action.replace(/_/g, ' ')}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" noWrap display="block">
                            {log.username || 'system'} {log.details?.title ? `• ${log.details.title}` : ''}
                          </Typography>
                        </Box>
                        <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                          {log.timestamp ? formatTime(log.timestamp) : ''}
                        </Typography>
                      </Box>
                    );
                  })}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
