import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  IconButton,
  InputAdornment,
  Checkbox,
  FormControlLabel,
  Alert,
  CircularProgress,
  Divider,
  Chip,
  Grid,
  Avatar,
  Tooltip,
  LinearProgress
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Lock as LockIcon,
  Email as EmailIcon,
  Security as SecurityIcon,
  Shield as ShieldIcon,
  Login as LoginIcon,
  Info as InfoIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import { authService } from '../services/authService';
import { auditService } from '../services/auditService';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated } = useAuth();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [lockoutTime, setLockoutTime] = useState(null);

  useEffect(() => {
    if (isAuthenticated) {
      const from = location.state?.from || '/dashboard';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  useEffect(() => {
    // Check password strength
    const strength = calculatePasswordStrength(formData.password);
    setPasswordStrength(strength);
  }, [formData.password]);

  const calculatePasswordStrength = (password) => {
    let score = 0;

    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;

    return score;
  };

  const handleChange = (field) => (e) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value
    }));
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Validate inputs
      if (!formData.email || !formData.password) {
        setError('Please enter email and password');
        setLoading(false);
        return;
      }

      // Attempt login
      const result = await login(formData.email, formData.password, formData.rememberMe);

      if (result.mfaRequired) {
        setMfaRequired(true);
        setLoading(false);
        return;
      }

      setSuccess('Login successful');

      // Log successful login
      await auditService.logEvent({
        action: 'LOGIN',
        resourceType: 'auth',
        details: {
          email: formData.email,
          rememberMe: formData.rememberMe
        },
        status: 'success'
      });

      // Redirect
      setTimeout(() => {
        const from = location.state?.from || '/dashboard';
        navigate(from, { replace: true });
      }, 500);

    } catch (error) {
      console.error('Login failed:', error);

      // Handle specific errors
      if (error.message?.includes('locked')) {
        setLockoutTime(error.lockoutTime);
        setError(`Account locked. Try again in ${Math.ceil(error.lockoutTime / 60)} minutes`);
      } else if (error.message?.includes('Invalid credentials')) {
        setError('Invalid email or password');
      } else if (error.message?.includes('deactivated')) {
        setError('Account is deactivated. Contact administrator');
      } else {
        setError(error.message || 'Login failed');
      }

      // Log failed login
      await auditService.logEvent({
        action: 'AUTH_FAILED',
        resourceType: 'auth',
        details: {
          email: formData.email,
          reason: error.message
        },
        status: 'failure'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMfaSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await authService.verifyMfa(mfaCode);

      setSuccess('MFA verification successful');

      setTimeout(() => {
        const from = location.state?.from || '/dashboard';
        navigate(from, { replace: true });
      }, 500);

    } catch (error) {
      setError('Invalid MFA code');
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrengthColor = () => {
    if (passwordStrength <= 1) return 'error.main';
    if (passwordStrength <= 2) return 'warning.main';
    if (passwordStrength <= 3) return 'info.main';
    if (passwordStrength <= 4) return 'success.main';
    return 'success.main';
  };

  const getPasswordStrengthLabel = () => {
    if (passwordStrength <= 1) return 'Weak';
    if (passwordStrength <= 2) return 'Fair';
    if (passwordStrength <= 3) return 'Good';
    if (passwordStrength <= 4) return 'Strong';
    return 'Very Strong';
  };

  return (
    <Box sx={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      bgcolor: 'background.default',
      p: 2
    }}>
      <Paper
        elevation={3}
        sx={{
          maxWidth: 450,
          width: '100%',
          p: 4,
          borderRadius: 2,
          borderTop: 4,
          borderColor: 'primary.main'
        }}
      >
        {/* Logo */}
        <Box sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          mb: 3
        }}>
          <Avatar
            sx={{
              width: 64,
              height: 64,
              bgcolor: 'primary.main',
              mb: 2
            }}
          >
            <ShieldIcon sx={{ fontSize: 32 }} />
          </Avatar>

          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Privacy-Aware RAG
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Secure Enterprise Knowledge Base
          </Typography>
        </Box>

        {/* MFA verification */}
        {mfaRequired ? (
          <Box>
            <Alert severity="info" sx={{ mb: 2 }}>
              Multi-factor authentication required
            </Alert>

            <TextField
              fullWidth
              label="Enter MFA Code"
              value={mfaCode}
              onChange={(e) => setMfaCode(e.target.value)}
              size="small"
              sx={{ mb: 2 }}
              placeholder="6-digit code"
            />

            <Button
              fullWidth
              variant="contained"
              onClick={handleMfaSubmit}
              disabled={loading || mfaCode.length < 6}
              startIcon={loading ? <CircularProgress size={16} /> : <LockIcon />}
            >
              Verify
            </Button>

            <Button
              fullWidth
              variant="text"
              onClick={() => setMfaRequired(false)}
              sx={{ mt: 1 }}
            >
              Back to login
            </Button>
          </Box>
        ) : (
          <form onSubmit={handleSubmit}>
            {/* Error/Success messages */}
            {error && (
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                {error}
              </Alert>
            )}

            {success && (
              <Alert severity="success" sx={{ mb: 2 }}>
                {success}
              </Alert>
            )}

            {/* Lockout warning */}
            {lockoutTime && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                Account temporarily locked. Please try again later.
              </Alert>
            )}

            {/* Email field */}
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={formData.email}
              onChange={handleChange('email')}
              size="small"
              required
              disabled={loading}
              sx={{ mb: 2 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <EmailIcon fontSize="small" />
                  </InputAdornment>
                )
              }}
            />

            {/* Password field */}
            <TextField
              fullWidth
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={handleChange('password')}
              size="small"
              required
              disabled={loading}
              sx={{ mb: 1 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockIcon fontSize="small" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />

            {/* Password strength indicator */}
            {formData.password && (
              <Box sx={{ mb: 2 }}>
                <Box sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  mb: 0.5
                }}>
                  <Typography variant="caption" color="text.secondary">
                    Password Strength
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ color: getPasswordStrengthColor(), fontWeight: 600 }}
                  >
                    {getPasswordStrengthLabel()}
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={(passwordStrength / 5) * 100}
                  sx={{
                    height: 4,
                    borderRadius: 2,
                    bgcolor: 'action.hover',
                    '& .MuiLinearProgress-bar': {
                      bgcolor: getPasswordStrengthColor()
                    }
                  }}
                />
              </Box>
            )}

            {/* Remember me */}
            <Box sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 2
            }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.rememberMe}
                    onChange={(e) => handleChange('rememberMe')({
                      target: { value: e.target.checked }
                    })}
                    size="small"
                  />
                }
                label="Remember me"
              />

              <Link to="/forgot-password" style={{ textDecoration: 'none' }}>
                <Typography variant="body2" color="primary">
                  Forgot password?
                </Typography>
              </Link>
            </Box>

            {/* Submit button */}
            <Button
              fullWidth
              type="submit"
              variant="contained"
              disabled={loading}
              startIcon={loading ? <CircularProgress size={16} /> : <LoginIcon />}
              sx={{ mb: 2 }}
            >
              {loading ? 'Logging in...' : 'Login'}
            </Button>

            <Divider sx={{ my: 2 }}>
              <Typography variant="caption" color="text.secondary">
                OR
              </Typography>
            </Divider>

            {/* Register link */}
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Don't have an account?{' '}
                <Link to="/register" style={{ textDecoration: 'none' }}>
                  <Typography component="span" variant="body2" color="primary" sx={{ fontWeight: 600 }}>
                    Register here
                  </Typography>
                </Link>
              </Typography>
            </Box>
          </form>
        )}

        {/* Security info */}
        <Box sx={{
          mt: 3,
          p: 2,
          bgcolor: 'action.hover',
          borderRadius: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 1
        }}>
          <SecurityIcon sx={{ fontSize: 20, color: 'success.main' }} />
          <Typography variant="caption" color="text.secondary">
            All communications are encrypted and secure
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
};

export default Login;