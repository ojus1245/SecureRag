import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Button } from '@mui/material';
import { Home as HomeIcon, ArrowBack as ArrowBackIcon } from '@mui/icons-material';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        textAlign: 'center',
        p: 3
      }}
    >
      <Typography
        variant="h1"
        sx={{
          fontSize: '8rem',
          fontWeight: 800,
          background: 'linear-gradient(135deg, #6366f1, #ec4899)',
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          mb: 2,
          lineHeight: 1
        }}
      >
        404
      </Typography>
      <Typography variant="h4" fontWeight={600} gutterBottom>
        Page Not Found
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 500 }}>
        The page you're looking for doesn't exist or has been moved.
        Let's get you back on track.
      </Typography>
      <Box sx={{ display: 'flex', gap: 2 }}>
        <Button
          variant="contained"
          startIcon={<HomeIcon />}
          onClick={() => navigate('/dashboard')}
          sx={{
            background: 'linear-gradient(135deg, #6366f1, #818cf8)',
            '&:hover': {
              background: 'linear-gradient(135deg, #4f46e5, #6366f1)'
            }
          }}
        >
          Go to Dashboard
        </Button>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(-1)}
        >
          Go Back
        </Button>
      </Box>
    </Box>
  );
};

export default NotFound;
