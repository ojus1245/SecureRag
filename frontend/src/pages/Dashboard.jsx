import React from 'react';
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
  Divider
} from '@mui/material';
import {
  Chat as ChatIcon,
  Description as DocumentIcon,
  Security as SecurityIcon,
  TrendingUp as TrendingUpIcon,
  AccessTime as TimeIcon,
  ArrowForward as ArrowForwardIcon,
  Shield as ShieldIcon,
  Storage as StorageIcon
} from '@mui/icons-material';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useSelector(state => state.auth);

  const stats = [
    {
      title: 'Total Conversations',
      value: '24',
      change: '+12%',
      icon: <ChatIcon />,
      color: '#6366f1',
      bgColor: 'rgba(99,102,241,0.1)'
    },
    {
      title: 'Documents Indexed',
      value: '156',
      change: '+8%',
      icon: <DocumentIcon />,
      color: '#10b981',
      bgColor: 'rgba(16,185,129,0.1)'
    },
    {
      title: 'Security Score',
      value: '94%',
      change: '+2%',
      icon: <SecurityIcon />,
      color: '#f59e0b',
      bgColor: 'rgba(245,158,11,0.1)'
    },
    {
      title: 'Queries Today',
      value: '47',
      change: '+23%',
      icon: <TrendingUpIcon />,
      color: '#ec4899',
      bgColor: 'rgba(236,72,153,0.1)'
    }
  ];

  const recentActivity = [
    { action: 'Queried knowledge base', time: '2 minutes ago', type: 'query' },
    { action: 'Uploaded financial_report.pdf', time: '1 hour ago', type: 'upload' },
    { action: 'Updated access policy', time: '3 hours ago', type: 'security' },
    { action: 'New conversation started', time: '5 hours ago', type: 'query' }
  ];

  return (
    <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto' }}>
      {/* Welcome Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={700} gutterBottom>
          Welcome back, {user?.name || 'User'} 👋
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Here's an overview of your privacy-aware knowledge base activity
        </Typography>
      </Box>

      {/* Stats Grid */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {stats.map((stat, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card
              sx={{
                height: '100%',
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
        {/* Quick Actions */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
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
                      py: 2,
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
                      py: 2,
                      justifyContent: 'flex-start',
                      borderRadius: 2,
                      textAlign: 'left'
                    }}
                  >
                    Upload Document
                  </Button>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<ShieldIcon />}
                    endIcon={<ArrowForwardIcon />}
                    onClick={() => navigate('/settings')}
                    sx={{
                      py: 2,
                      justifyContent: 'flex-start',
                      borderRadius: 2,
                      textAlign: 'left'
                    }}
                  >
                    Privacy Settings
                  </Button>
                </Grid>
              </Grid>

              {/* System Health */}
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  System Health
                </Typography>
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2">Storage Used</Typography>
                    <Typography variant="body2" fontWeight={600}>2.4 GB / 10 GB</Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={24}
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      bgcolor: 'rgba(99,102,241,0.1)',
                      '& .MuiLinearProgress-bar': { bgcolor: '#6366f1', borderRadius: 4 }
                    }}
                  />
                </Box>
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2">API Requests (Daily)</Typography>
                    <Typography variant="body2" fontWeight={600}>47 / 1000</Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={4.7}
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      bgcolor: 'rgba(16,185,129,0.1)',
                      '& .MuiLinearProgress-bar': { bgcolor: '#10b981', borderRadius: 4 }
                    }}
                  />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Activity */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Recent Activity
              </Typography>
              <Divider sx={{ mb: 2 }} />
              {recentActivity.map((activity, index) => (
                <Box
                  key={index}
                  sx={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 2,
                    mb: 2,
                    pb: 2,
                    borderBottom: index < recentActivity.length - 1 ? '1px solid' : 'none',
                    borderColor: 'divider'
                  }}
                >
                  <Avatar
                    sx={{
                      width: 36,
                      height: 36,
                      bgcolor: activity.type === 'query'
                        ? 'rgba(99,102,241,0.1)'
                        : activity.type === 'upload'
                        ? 'rgba(16,185,129,0.1)'
                        : 'rgba(245,158,11,0.1)',
                      color: activity.type === 'query'
                        ? '#6366f1'
                        : activity.type === 'upload'
                        ? '#10b981'
                        : '#f59e0b'
                    }}
                  >
                    {activity.type === 'query' ? <ChatIcon fontSize="small" /> :
                     activity.type === 'upload' ? <DocumentIcon fontSize="small" /> :
                     <SecurityIcon fontSize="small" />}
                  </Avatar>
                  <Box>
                    <Typography variant="body2" fontWeight={500}>
                      {activity.action}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {activity.time}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
