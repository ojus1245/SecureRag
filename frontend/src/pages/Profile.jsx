import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Avatar,
  TextField,
  Button,
  Grid,
  Divider,
  Switch,
  FormControlLabel,
  Chip,
  Alert,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction
} from '@mui/material';
import {
  Person as PersonIcon,
  Email as EmailIcon,
  Security as SecurityIcon,
  Lock as LockIcon,
  Notifications as NotificationsIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  VpnKey as KeyIcon,
  VerifiedUser as VerifiedIcon
} from '@mui/icons-material';

const Profile = () => {
  const { user } = useSelector(state => state.auth);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    department: user?.department || '',
    phone: user?.phone || ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = () => {
    setIsEditing(false);
    // TODO: Dispatch update profile action
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1000, mx: 'auto' }}>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Profile
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Manage your account settings and preferences
      </Typography>

      <Grid container spacing={3}>
        {/* Profile Card */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 4 }}>
              <Avatar
                sx={{
                  width: 100,
                  height: 100,
                  mx: 'auto',
                  mb: 2,
                  bgcolor: '#6366f1',
                  fontSize: '2.5rem',
                  fontWeight: 700
                }}
              >
                {(user?.name || 'U').charAt(0).toUpperCase()}
              </Avatar>
              <Typography variant="h5" fontWeight={600}>
                {user?.name || 'User'}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {user?.email || 'user@example.com'}
              </Typography>
              <Chip
                icon={<VerifiedIcon />}
                label={user?.role || 'User'}
                color="primary"
                variant="outlined"
                sx={{ textTransform: 'capitalize' }}
              />
              <Divider sx={{ my: 3 }} />
              <Box sx={{ textAlign: 'left' }}>
                <Typography variant="caption" color="text.secondary" display="block">
                  Security Clearance
                </Typography>
                <Chip
                  label={user?.securityClearance || 'Standard'}
                  size="small"
                  color="success"
                  sx={{ mt: 0.5 }}
                />
              </Box>
              <Box sx={{ textAlign: 'left', mt: 2 }}>
                <Typography variant="caption" color="text.secondary" display="block">
                  Member Since
                </Typography>
                <Typography variant="body2">
                  {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Details Card */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6" fontWeight={600}>
                  Personal Information
                </Typography>
                {!isEditing ? (
                  <Button startIcon={<EditIcon />} onClick={() => setIsEditing(true)}>
                    Edit
                  </Button>
                ) : (
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button startIcon={<SaveIcon />} variant="contained" onClick={handleSave}>
                      Save
                    </Button>
                    <Button startIcon={<CancelIcon />} onClick={() => setIsEditing(false)}>
                      Cancel
                    </Button>
                  </Box>
                )}
              </Box>

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Full Name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    disabled={!isEditing}
                    InputProps={{ startAdornment: <PersonIcon color="action" sx={{ mr: 1 }} /> }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    disabled={!isEditing}
                    InputProps={{ startAdornment: <EmailIcon color="action" sx={{ mr: 1 }} /> }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Department"
                    name="department"
                    value={formData.department}
                    onChange={handleChange}
                    disabled={!isEditing}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    disabled={!isEditing}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Security Settings */}
          <Card sx={{ mt: 3 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Security Settings
              </Typography>
              <List>
                <ListItem>
                  <ListItemIcon><LockIcon /></ListItemIcon>
                  <ListItemText
                    primary="Password"
                    secondary="Last changed 30 days ago"
                  />
                  <ListItemSecondaryAction>
                    <Button size="small" variant="outlined">Change</Button>
                  </ListItemSecondaryAction>
                </ListItem>
                <ListItem>
                  <ListItemIcon><KeyIcon /></ListItemIcon>
                  <ListItemText
                    primary="Two-Factor Authentication"
                    secondary="Add extra security to your account"
                  />
                  <ListItemSecondaryAction>
                    <Switch defaultChecked={user?.mfaEnabled} />
                  </ListItemSecondaryAction>
                </ListItem>
                <ListItem>
                  <ListItemIcon><NotificationsIcon /></ListItemIcon>
                  <ListItemText
                    primary="Security Alerts"
                    secondary="Get notified about suspicious activity"
                  />
                  <ListItemSecondaryAction>
                    <Switch defaultChecked />
                  </ListItemSecondaryAction>
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Profile;
