import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  IconButton,
  InputAdornment,
  Alert,
  CircularProgress,
  Divider,
  Avatar,
  Stepper,
  Step,
  StepLabel,
  Grid,
  FormControl,
  FormControlLabel,
  Checkbox,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  LinearProgress,
  Chip
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Lock as LockIcon,
  Security as SecurityIcon,
  Shield as ShieldIcon,
  Business as BusinessIcon,
  CheckCircle as CheckCircleIcon,
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import { authService } from '../services/authService';
import { auditService } from '../services/auditService';

const Register = () => {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    department: '',
    securityClearance: 'internal',
    agreeToTerms: false
  });

  const steps = ['Account Details', 'Personal Information', 'Security', 'Review'];

  const departments = ['IT', 'HR', 'Finance', 'Marketing', 'Sales', 'Operations', 'Legal', 'R&D'];

  const handleChange = (field) => (e) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value
    }));
    setError(null);
  };

  const validateStep = (step) => {
    switch (step) {
      case 0:
        return (
          formData.username.trim().length >= 3 &&
          /^[a-zA-Z0-9_.-]+$/.test(formData.username.trim()) &&
          formData.email.includes('@') &&
          formData.password.length >= 8 &&
          formData.password === formData.confirmPassword
        );
      case 1:
        return (
          formData.fullName.length >= 2 &&
          formData.department.length > 0
        );
      case 2:
        return formData.securityClearance.length > 0;
      case 3:
        return formData.agreeToTerms;
      default:
        return false;
    }
  };

  const handleNext = () => {
    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await register({
        username: formData.username,
        email: formData.email,
        password: formData.password,
        fullName: formData.fullName,
        department: formData.department,
        securityClearance: formData.securityClearance
      });

      setSuccess('Registration successful! Redirecting to login...');

      // Log registration
      await auditService.logEvent({
        action: 'USER_CREATE',
        resourceType: 'user',
        details: {
          username: formData.username,
          email: formData.email,
          department: formData.department
        },
        status: 'success'
      });

      // Redirect to login
      setTimeout(() => {
        navigate('/login');
      }, 2000);

    } catch (error) {
      console.error('Registration failed:', error);

      if (error.message?.includes('already exists')) {
        setError('User already exists with this email or username');
      } else {
        setError(error.message || 'Registration failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrength = () => {
    let score = 0;
    if (formData.password.length >= 8) score++;
    if (formData.password.length >= 12) score++;
    if (/[a-z]/.test(formData.password) && /[A-Z]/.test(formData.password)) score++;
    if (/\d/.test(formData.password)) score++;
    if (/[^a-zA-Z0-9]/.test(formData.password)) score++;
    return score;
  };

  const passwordStrength = getPasswordStrength();

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
          maxWidth: 600,
          width: '100%',
          p: 4,
          borderRadius: 2,
          borderTop: 4,
          borderColor: 'primary.main'
        }}
      >
        {/* Header */}
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
            Create Account
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Register for Privacy-Aware RAG
          </Typography>
        </Box>

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

        {/* Stepper */}
        <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {/* Step 0: Account Details */}
        {activeStep === 0 && (
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Username"
                value={formData.username}
                onChange={handleChange('username')}
                size="small"
                required
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonIcon fontSize="small" />
                    </InputAdornment>
                  )
                }}
                error={formData.username.length > 0 && !/^[a-zA-Z0-9_.-]+$/.test(formData.username)}
                helperText={
                  formData.username.length > 0 && !/^[a-zA-Z0-9_.-]+$/.test(formData.username)
                    ? 'Only letters, numbers, underscores, dashes, and dots allowed (no spaces)'
                    : '3-50 characters: letters, numbers, underscores, dashes, dots'
                }
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={formData.email}
                onChange={handleChange('email')}
                size="small"
                required
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailIcon fontSize="small" />
                    </InputAdornment>
                  )
                }}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleChange('password')}
                size="small"
                required
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockIcon fontSize="small" />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />

              {formData.password && (
                <Box sx={{ mt: 1 }}>
                  <LinearProgress
                    variant="determinate"
                    value={(passwordStrength / 5) * 100}
                    sx={{ height: 4, borderRadius: 2 }}
                  />
                </Box>
              )}
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Confirm Password"
                type={showConfirmPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={handleChange('confirmPassword')}
                size="small"
                required
                error={formData.confirmPassword && formData.password !== formData.confirmPassword}
                helperText={
                  formData.confirmPassword && formData.password !== formData.confirmPassword
                    ? 'Passwords do not match'
                    : ''
                }
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockIcon fontSize="small" />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                        {showConfirmPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />
            </Grid>
          </Grid>
        )}

        {/* Step 1: Personal Information */}
        {activeStep === 1 && (
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Full Name"
                value={formData.fullName}
                onChange={handleChange('fullName')}
                size="small"
                required
              />
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth size="small" required>
                <InputLabel>Department</InputLabel>
                <Select
                  value={formData.department}
                  onChange={handleChange('department')}
                  label="Department"
                  startAdornment={
                    <InputAdornment position="start">
                      <BusinessIcon fontSize="small" />
                    </InputAdornment>
                  }
                >
                  {departments.map((dept) => (
                    <MenuItem key={dept} value={dept}>
                      {dept}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        )}

        {/* Step 2: Security */}
        {activeStep === 2 && (
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <FormControl fullWidth size="small" required>
                <InputLabel>Security Clearance</InputLabel>
                <Select
                  value={formData.securityClearance}
                  onChange={handleChange('securityClearance')}
                  label="Security Clearance"
                  startAdornment={
                    <InputAdornment position="start">
                      <SecurityIcon fontSize="small" />
                    </InputAdornment>
                  }
                >
                  <MenuItem value="public">Public</MenuItem>
                  <MenuItem value="internal">Internal</MenuItem>
                  <MenuItem value="confidential">Confidential</MenuItem>
                  <MenuItem value="restricted">Restricted</MenuItem>
                </Select>
                <FormHelperText>
                  Your clearance level determines document access
                </FormHelperText>
              </FormControl>
            </Grid>
          </Grid>
        )}

        {/* Step 3: Review */}
        {activeStep === 3 && (
          <Box>
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
              Review Your Information
            </Typography>

            <Box sx={{
              p: 2,
              bgcolor: 'action.hover',
              borderRadius: 1,
              mb: 2
            }}>
              <Grid container spacing={1}>
                <Grid item xs={4}>
                  <Typography variant="caption" color="text.secondary">Username</Typography>
                  <Typography variant="body2">{formData.username}</Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="caption" color="text.secondary">Email</Typography>
                  <Typography variant="body2">{formData.email}</Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="caption" color="text.secondary">Full Name</Typography>
                  <Typography variant="body2">{formData.fullName}</Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="caption" color="text.secondary">Department</Typography>
                  <Typography variant="body2">{formData.department}</Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="caption" color="text.secondary">Clearance</Typography>
                  <Chip
                    label={formData.securityClearance}
                    size="small"
                    color={formData.securityClearance === 'restricted' ? 'error' : 'primary'}
                  />
                </Grid>
              </Grid>
            </Box>

            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.agreeToTerms}
                  onChange={(e) => handleChange('agreeToTerms')({
                    target: { value: e.target.checked }
                  })}
                />
              }
              label="I agree to the terms and conditions"
            />
          </Box>
        )}

        {/* Navigation buttons */}
        <Box sx={{
          display: 'flex',
          justifyContent: 'space-between',
          mt: 3
        }}>
          <Button
            onClick={activeStep === 0 ? () => navigate('/login') : handleBack}
            startIcon={<ArrowBackIcon />}
          >
            {activeStep === 0 ? 'Back to Login' : 'Back'}
          </Button>

          {activeStep < steps.length - 1 ? (
            <Button
              variant="contained"
              onClick={handleNext}
              disabled={!validateStep(activeStep)}
              endIcon={<ArrowForwardIcon />}
            >
              Next
            </Button>
          ) : (
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={!validateStep(activeStep) || loading}
              startIcon={loading ? <CircularProgress size={16} /> : <CheckCircleIcon />}
            >
              {loading ? 'Registering...' : 'Complete Registration'}
            </Button>
          )}
        </Box>

        {/* Login link */}
        <Divider sx={{ my: 2 }}>
          <Typography variant="caption" color="text.secondary">
            OR
          </Typography>
        </Divider>

        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Already have an account?{' '}
            <Link to="/login" style={{ textDecoration: 'none' }}>
              <Typography component="span" variant="body2" color="primary" sx={{ fontWeight: 600 }}>
                Login here
              </Typography>
            </Link>
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
};

export default Register;