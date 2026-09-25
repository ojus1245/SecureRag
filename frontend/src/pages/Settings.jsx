import React, { useState, useEffect } from 'react';
import {
    Box,
    Paper,
    Typography,
    Grid,
    Card,
    CardContent,
    CardHeader,
    Avatar,
    IconButton,
    Tooltip,
    Chip,
    Button,
    Alert,
    CircularProgress,
    TextField,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Switch,
    FormControlLabel,
    Divider,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Tabs,
    Tab,
    Stack
} from '@mui/material';
import {
    Person as PersonIcon,
    Security as SecurityIcon,
    Notifications as NotificationsIcon,
    Language as LanguageIcon,
    Palette as PaletteIcon,
    Lock as LockIcon,
    Save as SaveIcon,
    Refresh as RefreshIcon,
    Delete as DeleteIcon,
    Info as InfoIcon,
    DarkMode as DarkModeIcon,
    LightMode as LightModeIcon,
    Email as EmailIcon,
    Visibility as VisibilityIcon,
    VisibilityOff as VisibilityOffIcon,
    CheckCircle as CheckCircleIcon,
    Warning as WarningIcon
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { settingsService } from '../services/settingsService';
import { auditService } from '../services/auditService';

const Settings = () => {
    const { user, updateUser } = useAuth();
    const { isDarkMode, toggleTheme } = useTheme();

    const [activeTab, setActiveTab] = useState(0);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [showPassword, setShowPassword] = useState(false);
    const [changePasswordOpen, setChangePasswordOpen] = useState(false);

    // Profile settings
    const [profileData, setProfileData] = useState({
        fullName: user?.fullName || '',
        email: user?.email || '',
        department: user?.department || '',
        language: user?.preferences?.language || 'en',
        timezone: user?.preferences?.timezone || 'UTC'
    });

    // Notification settings
    const [notificationSettings, setNotificationSettings] = useState({
        emailNotifications: user?.preferences?.emailNotifications ?? true,
        pushNotifications: user?.preferences?.pushNotifications ?? true,
        securityAlerts: user?.preferences?.securityAlerts ?? true,
        documentUpdates: user?.preferences?.documentUpdates ?? true,
        weeklyDigest: user?.preferences?.weeklyDigest ?? false
    });

    // Security settings
    const [securitySettings, setSecuritySettings] = useState({
        mfaEnabled: user?.mfaEnabled ?? false,
        sessionTimeout: 3600,
        showSecurityClearance: true
    });

    // Password change
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    const handleTabChange = (event, newValue) => {
        setActiveTab(newValue);
    };

    const handleProfileChange = (field) => (e) => {
        setProfileData(prev => ({
            ...prev,
            [field]: e.target.value
        }));
        setError(null);
        setSuccess(null);
    };

    const handleNotificationChange = (field) => (e) => {
        setNotificationSettings(prev => ({
            ...prev,
            [field]: e.target.checked
        }));
    };

    const handleSecurityChange = (field) => (e) => {
        setSecuritySettings(prev => ({
            ...prev,
            [field]: e.target.checked || e.target.value
        }));
    };

    const handlePasswordChange = (field) => (e) => {
        setPasswordData(prev => ({
            ...prev,
            [field]: e.target.value
        }));
    };

    const handleSaveProfile = async () => {
        setSaving(true);
        setError(null);
        setSuccess(null);

        try {
            await updateUser(user.id, profileData);
            setSuccess('Profile updated successfully');

            // Log audit event
            await auditService.logEvent({
                action: 'USER_UPDATE',
                resourceType: 'user',
                resourceId: user.id,
                details: {
                    fields: Object.keys(profileData)
                },
                status: 'success'
            });
        } catch (error) {
            console.error('Failed to update profile:', error);
            setError('Failed to update profile');
        } finally {
            setSaving(false);
        }
    };

    const handleSaveNotifications = async () => {
        setSaving(true);
        setError(null);
        setSuccess(null);

        try {
            await settingsService.updateNotificationSettings(notificationSettings);
            setSuccess('Notification settings updated');
        } catch (error) {
            console.error('Failed to update notifications:', error);
            setError('Failed to update notification settings');
        } finally {
            setSaving(false);
        }
    };

    const handleSaveSecurity = async () => {
        setSaving(true);
        setError(null);
        setSuccess(null);

        try {
            await settingsService.updateSecuritySettings(securitySettings);
            setSuccess('Security settings updated');

            // Log audit event
            await auditService.logEvent({
                action: 'SYSTEM_CONFIG',
                resourceType: 'system',
                details: {
                    settings: 'security'
                },
                status: 'success'
            });
        } catch (error) {
            console.error('Failed to update security settings:', error);
            setError('Failed to update security settings');
        } finally {
            setSaving(false);
        }
    };

    const handleChangePassword = async () => {
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setError('New passwords do not match');
            return;
        }

        setSaving(true);
        setError(null);

        try {
            await settingsService.changePassword(
                passwordData.currentPassword,
                passwordData.newPassword
            );

            setSuccess('Password changed successfully');
            setChangePasswordOpen(false);
            setPasswordData({
                currentPassword: '',
                newPassword: '',
                confirmPassword: ''
            });

            // Log audit event
            await auditService.logEvent({
                action: 'USER_UPDATE',
                resourceType: 'user',
                resourceId: user.id,
                details: {
                    action: 'PASSWORD_CHANGE'
                },
                status: 'success'
            });
        } catch (error) {
            console.error('Failed to change password:', error);
            setError(error.message || 'Failed to change password');
        } finally {
            setSaving(false);
        }
    };

    const tabs = [
        { label: 'Profile', icon: <PersonIcon /> },
        { label: 'Notifications', icon: <NotificationsIcon /> },
        { label: 'Security', icon: <SecurityIcon /> },
        { label: 'Appearance', icon: <PaletteIcon /> }
    ];

    return (
        <Box sx={{ p: 3 }}>
            {/* Header */}
            <Box sx={{ mb: 3 }}>
                <Typography variant="h5" gutterBottom>
                    Settings
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Manage your account preferences
                </Typography>
            </Box>

            {/* Error/Success messages */}
            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            {success && (
                <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
                    {success}
                </Alert>
            )}

            {/* Tabs */}
            <Tabs
                value={activeTab}
                onChange={handleTabChange}
                sx={{ mb: 3 }}
            >
                {tabs.map((tab, index) => (
                    <Tab
                        key={index}
                        label={tab.label}
                        icon={tab.icon}
                        iconPosition="start"
                    />
                ))}
            </Tabs>

            {/* Profile Tab */}
            {activeTab === 0 && (
                <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom>
                        Profile Information
                    </Typography>

                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Full Name"
                                value={profileData.fullName}
                                onChange={handleProfileChange('fullName')}
                                size="small"
                            />
                        </Grid>

                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Email"
                                value={profileData.email}
                                onChange={handleProfileChange('email')}
                                size="small"
                                disabled
                            />
                        </Grid>

                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Department"
                                value={profileData.department}
                                onChange={handleProfileChange('department')}
                                size="small"
                                disabled
                            />
                        </Grid>

                        <Grid item xs={12} sm={6}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Language</InputLabel>
                                <Select
                                    value={profileData.language}
                                    onChange={handleProfileChange('language')}
                                    label="Language"
                                >
                                    <MenuItem value="en">English</MenuItem>
                                    <MenuItem value="es">Spanish</MenuItem>
                                    <MenuItem value="fr">French</MenuItem>
                                    <MenuItem value="de">German</MenuItem>
                                    <MenuItem value="zh">Chinese</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                    </Grid>

                    <Box sx={{ mt: 2 }}>
                        <Button
                            variant="contained"
                            onClick={handleSaveProfile}
                            disabled={saving}
                            startIcon={saving ? <CircularProgress size={16} /> : <SaveIcon />}
                        >
                            Save Profile
                        </Button>
                    </Box>
                </Paper>
            )}

            {/* Notifications Tab */}
            {activeTab === 1 && (
                <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom>
                        Notification Preferences
                    </Typography>

                    <List>
                        <ListItem>
                            <ListItemIcon>
                                <EmailIcon />
                            </ListItemIcon>
                            <ListItemText
                                primary="Email Notifications"
                                secondary="Receive notifications via email"
                            />
                            <Switch
                                checked={notificationSettings.emailNotifications}
                                onChange={handleNotificationChange('emailNotifications')}
                            />
                        </ListItem>
                        <Divider />

                        <ListItem>
                            <ListItemIcon>
                                <NotificationsIcon />
                            </ListItemIcon>
                            <ListItemText
                                primary="Push Notifications"
                                secondary="Receive push notifications"
                            />
                            <Switch
                                checked={notificationSettings.pushNotifications}
                                onChange={handleNotificationChange('pushNotifications')}
                            />
                        </ListItem>
                        <Divider />

                        <ListItem>
                            <ListItemIcon>
                                <SecurityIcon />
                            </ListItemIcon>
                            <ListItemText
                                primary="Security Alerts"
                                secondary="Receive security-related notifications"
                            />
                            <Switch
                                checked={notificationSettings.securityAlerts}
                                onChange={handleNotificationChange('securityAlerts')}
                            />
                        </ListItem>
                        <Divider />

                        <ListItem>
                            <ListItemIcon>
                                <DescriptionIcon />
                            </ListItemIcon>
                            <ListItemText
                                primary="Document Updates"
                                secondary="Notify when documents are updated"
                            />
                            <Switch
                                checked={notificationSettings.documentUpdates}
                                onChange={handleNotificationChange('documentUpdates')}
                            />
                        </ListItem>
                    </List>

                    <Box sx={{ mt: 2 }}>
                        <Button
                            variant="contained"
                            onClick={handleSaveNotifications}
                            disabled={saving}
                            startIcon={saving ? <CircularProgress size={16} /> : <SaveIcon />}
                        >
                            Save Preferences
                        </Button>
                    </Box>
                </Paper>
            )}

            {/* Security Tab */}
            {activeTab === 2 && (
                <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom>
                        Security Settings
                    </Typography>

                    <List>
                        <ListItem>
                            <ListItemIcon>
                                <LockIcon />
                            </ListItemIcon>
                            <ListItemText
                                primary="Two-Factor Authentication"
                                secondary="Add an extra layer of security"
                            />
                            <Switch
                                checked={securitySettings.mfaEnabled}
                                onChange={handleSecurityChange('mfaEnabled')}
                            />
                        </ListItem>
                        <Divider />

                        <ListItem>
                            <ListItemIcon>
                                <SecurityIcon />
                            </ListItemIcon>
                            <ListItemText
                                primary="Show Security Clearance"
                                secondary="Display your clearance level"
                            />
                            <Switch
                                checked={securitySettings.showSecurityClearance}
                                onChange={handleSecurityChange('showSecurityClearance')}
                            />
                        </ListItem>
                    </List>

                    <Divider sx={{ my: 2 }} />

                    <Button
                        variant="outlined"
                        color="primary"
                        onClick={() => setChangePasswordOpen(true)}
                        startIcon={<LockIcon />}
                    >
                        Change Password
                    </Button>

                    <Box sx={{ mt: 2 }}>
                        <Button
                            variant="contained"
                            onClick={handleSaveSecurity}
                            disabled={saving}
                            startIcon={saving ? <CircularProgress size={16} /> : <SaveIcon />}
                        >
                            Save Security Settings
                        </Button>
                    </Box>
                </Paper>
            )}

            {/* Appearance Tab */}
            {activeTab === 3 && (
                <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom>
                        Appearance
                    </Typography>

                    <List>
                        <ListItem>
                            <ListItemIcon>
                                {isDarkMode ? <DarkModeIcon /> : <LightModeIcon />}
                            </ListItemIcon>
                            <ListItemText
                                primary="Dark Mode"
                                secondary="Toggle dark theme"
                            />
                            <Switch
                                checked={isDarkMode}
                                onChange={toggleTheme}
                            />
                        </ListItem>
                    </List>
                </Paper>
            )}

            {/* Change Password Dialog */}
            <Dialog
                open={changePasswordOpen}
                onClose={() => setChangePasswordOpen(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>Change Password</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Current Password"
                                type={showPassword ? 'text' : 'password'}
                                value={passwordData.currentPassword}
                                onChange={handlePasswordChange('currentPassword')}
                                size="small"
                                InputProps={{
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <IconButton size="small" onClick={() => setShowPassword(!showPassword)}>
                                                {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                                            </IconButton>
                                        </InputAdornment>
                                    )
                                }}
                            />
                        </Grid>

                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="New Password"
                                type={showPassword ? 'text' : 'password'}
                                value={passwordData.newPassword}
                                onChange={handlePasswordChange('newPassword')}
                                size="small"
                            />
                        </Grid>

                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Confirm New Password"
                                type={showPassword ? 'text' : 'password'}
                                value={passwordData.confirmPassword}
                                onChange={handlePasswordChange('confirmPassword')}
                                size="small"
                                error={passwordData.confirmPassword && passwordData.newPassword !== passwordData.confirmPassword}
                                helperText={
                                    passwordData.confirmPassword && passwordData.newPassword !== passwordData.confirmPassword
                                        ? 'Passwords do not match'
                                        : ''
                                }
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setChangePasswordOpen(false)}>Cancel</Button>
                    <Button
                        variant="contained"
                        onClick={handleChangePassword}
                        disabled={saving || !passwordData.currentPassword || !passwordData.newPassword || passwordData.newPassword !== passwordData.confirmPassword}
                        startIcon={saving ? <CircularProgress size={16} /> : <LockIcon />}
                    >
                        Change Password
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default Settings;