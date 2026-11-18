import React, { useState, useEffect, useCallback } from 'react';
import {
    Box,
    Paper,
    Typography,
    Button,
    TextField,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Chip,
    IconButton,
    Tooltip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    List,
    ListItem,
    ListItemText,
    ListItemAvatar,
    ListItemSecondaryAction,
    Avatar,
    Divider,
    Checkbox,
    FormControlLabel,
    FormGroup,
    Alert,
    Autocomplete,
    Switch,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    RadioGroup,
    Radio,
    Stack
} from '@mui/material';
import {
    Add as AddIcon,
    Delete as DeleteIcon,
    Edit as EditIcon,
    Person as PersonIcon,
    Group as GroupIcon,
    Security as SecurityIcon,
    Close as CloseIcon,
    Save as SaveIcon,
    Share as ShareIcon,
    AccessTime as TimeIcon,
    CheckCircle as CheckCircleIcon,
    Warning as WarningIcon
} from '@mui/icons-material';
import { DateTimePicker } from '@mui/x-date-pickers';
import { auditService } from '../../services/auditService';
import { useAuth } from '../../hooks/useAuth';

const AccessControlEditor = ({ document, onSave, onClose }) => {
    const { user } = useAuth();
    const [aclEntries, setAclEntries] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [shareDialogOpen, setShareDialogOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [permissions, setPermissions] = useState(['read']);
    const [expiresAt, setExpiresAt] = useState(null);
    const [users, setUsers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');

    const availablePermissions = [
        { value: 'read', label: 'Read', description: 'View document content' },
        { value: 'write', label: 'Write', description: 'Edit document' },
        { value: 'delete', label: 'Delete', description: 'Delete document' },
        { value: 'share', label: 'Share', description: 'Share with others' },
        { value: 'download', label: 'Download', description: 'Download document' },
        { value: 'export', label: 'Export', description: 'Export document' }
    ];

    const fetchACL = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const result = await documentService.getDocumentACL((document.id || document._id));
            setAclEntries(result.shares || []);
        } catch (error) {
            console.error('Failed to fetch ACL:', error);
            setError('Failed to load access control list');
        } finally {
            setLoading(false);
        }
    }, [(document.id || document._id)]);

    const searchUsers = async (query) => {
        try {
            const result = await documentService.searchUsers(query);
            setUsers(result.users || []);
        } catch (error) {
            console.error('Failed to search users:', error);
        }
    };

    useEffect(() => {
        fetchACL();
    }, [fetchACL]);

    useEffect(() => {
        if (searchTerm.length >= 2) {
            const debounce = setTimeout(() => {
                searchUsers(searchTerm);
            }, 300);

            return () => clearTimeout(debounce);
        }
    }, [searchTerm]);

    const handleShareDialogOpen = () => {
        setShareDialogOpen(true);
        setSelectedUser(null);
        setPermissions(['read']);
        setExpiresAt(null);
    };

    const handleShareDialogClose = () => {
        setShareDialogOpen(false);
        setSelectedUser(null);
    };

    const handlePermissionToggle = (permission) => {
        setPermissions((prev) => {
            if (prev.includes(permission)) {
                return prev.filter(p => p !== permission);
            }
            return [...prev, permission];
        });
    };

    const handleShare = async () => {
        if (!selectedUser || permissions.length === 0) {
            setError('Please select a user and at least one permission');
            return;
        }

        try {
            setLoading(true);

            await documentService.shareDocument((document.id || document._id), {
                userId: selectedUser.id,
                permissions,
                expiresAt
            });

            setSuccess('Document shared successfully');
            setShareDialogOpen(false);
            fetchACL();

            // Log audit event
            await auditService.logEvent({
                action: 'DOCUMENT_SHARE',
                resourceType: 'document',
                resourceId: (document.id || document._id),
                details: {
                    sharedWith: selectedUser.id,
                    permissions,
                    expiresAt
                },
                status: 'success'
            });
        } catch (error) {
            console.error('Failed to share document:', error);
            setError('Failed to share document');
        } finally {
            setLoading(false);
        }
    };

    const handleRevoke = async (aclEntry) => {
        try {
            await documentService.revokeDocumentShare((document.id || document._id), aclEntry.user.id);

            setSuccess('Access revoked successfully');
            fetchACL();

            // Log audit event
            await auditService.logEvent({
                action: 'ACL_UPDATE',
                resourceType: 'document',
                resourceId: (document.id || document._id),
                details: {
                    action: 'REVOKE',
                    userId: aclEntry.user.id
                },
                status: 'success'
            });
        } catch (error) {
            console.error('Failed to revoke access:', error);
            setError('Failed to revoke access');
        }
    };

    const handleUpdatePermissions = async (aclEntry, newPermissions) => {
        try {
            await documentService.updateDocumentShare((document.id || document._id), aclEntry.user.id, {
                permissions: newPermissions
            });

            setSuccess('Permissions updated');
            fetchACL();
        } catch (error) {
            console.error('Failed to update permissions:', error);
            setError('Failed to update permissions');
        }
    };

    return (
        <Paper elevation={3} sx={{ p: 3 }}>
            {/* Header */}
            <Box sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 3
            }}>
                <Box>
                    <Typography variant="h6" gutterBottom>
                        Access Control
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Manage who can access "{document.title}"
                    </Typography>
                </Box>

                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={handleShareDialogOpen}
                >
                    Share
                </Button>
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

            {/* Owner info */}
            <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: 'action.hover' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar>
                        <PersonIcon />
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle2">
                            {document.owner?.fullName || document.owner?.username || 'Owner'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            Owner - Full access
                        </Typography>
                    </Box>
                    <Chip
                        label="OWNER"
                        size="small"
                        color="primary"
                        variant="outlined"
                    />
                </Box>
            </Paper>

            {/* ACL Entries */}
            <Typography variant="subtitle1" gutterBottom>
                Shared Users ({aclEntries.length})
            </Typography>

            {aclEntries.length === 0 ? (
                <Box sx={{
                    textAlign: 'center',
                    py: 3,
                    color: 'text.secondary'
                }}>
                    <ShareIcon sx={{ fontSize: 40, mb: 1, opacity: 0.5 }} />
                    <Typography variant="body2">
                        No users have been granted access yet
                    </Typography>
                </Box>
            ) : (
                <List>
                    {aclEntries.map((entry, index) => (
                        <React.Fragment key={entry.id || index}>
                            <ListItem>
                                <ListItemAvatar>
                                    <Avatar>
                                        <PersonIcon />
                                    </Avatar>
                                </ListItemAvatar>

                                <ListItemText
                                    primary={entry.user?.fullName || entry.user?.username || 'Unknown User'}
                                    secondary={
                                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                                            {entry.permissions?.map((permission) => (
                                                <Chip
                                                    key={permission}
                                                    label={permission}
                                                    size="small"
                                                    variant="outlined"
                                                />
                                            ))}
                                            {entry.expiresAt && (
                                                <Chip
                                                    icon={<TimeIcon />}
                                                    label={`Expires: ${new Date(entry.expiresAt).toLocaleDateString()}`}
                                                    size="small"
                                                    color="warning"
                                                    variant="outlined"
                                                />
                                            )}
                                        </Box>
                                    }
                                />

                                <ListItemSecondaryAction>
                                    <Tooltip title="Edit permissions">
                                        <IconButton size="small">
                                            <EditIcon />
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Revoke access">
                                        <IconButton
                                            size="small"
                                            color="error"
                                            onClick={() => handleRevoke(entry)}
                                        >
                                            <DeleteIcon />
                                        </IconButton>
                                    </Tooltip>
                                </ListItemSecondaryAction>
                            </ListItem>
                            {index < aclEntries.length - 1 && <Divider />}
                        </React.Fragment>
                    ))}
                </List>
            )}

            {/* Share Dialog */}
            <Dialog
                open={shareDialogOpen}
                onClose={handleShareDialogClose}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>
                    Share Document
                    <IconButton
                        onClick={handleShareDialogClose}
                        sx={{ position: 'absolute', right: 8, top: 8 }}
                    >
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>

                <DialogContent>
                    {/* User selection */}
                    <Autocomplete
                        fullWidth
                        options={users}
                        getOptionLabel={(option) =>
                            `${option.fullName || option.username} (${option.email})`
                        }
                        value={selectedUser}
                        onChange={(e, newValue) => setSelectedUser(newValue)}
                        onInputChange={(e, value) => setSearchTerm(value)}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                label="Select User"
                                placeholder="Search users..."
                                size="small"
                                sx={{ mb: 2 }}
                            />
                        )}
                        renderOption={(props, option) => (
                            <li {...props}>
                                <Avatar sx={{ width: 24, height: 24, mr: 1, fontSize: '0.75rem' }}>
                                    {option.username?.[0]?.toUpperCase()}
                                </Avatar>
                                <Box>
                                    <Typography variant="body2">
                                        {option.fullName || option.username}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {option.email} • {option.department}
                                    </Typography>
                                </Box>
                            </li>
                        )}
                    />

                    {/* Permissions */}
                    <Typography variant="subtitle2" gutterBottom>
                        Permissions
                    </Typography>

                    <FormGroup sx={{ mb: 2 }}>
                        {availablePermissions.map((permission) => (
                            <FormControlLabel
                                key={permission.value}
                                control={
                                    <Checkbox
                                        checked={permissions.includes(permission.value)}
                                        onChange={() => handlePermissionToggle(permission.value)}
                                        size="small"
                                    />
                                }
                                label={
                                    <Box>
                                        <Typography variant="body2">
                                            {permission.label}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {permission.description}
                                        </Typography>
                                    </Box>
                                }
                            />
                        ))}
                    </FormGroup>

                    {/* Expiration */}
                    <Typography variant="subtitle2" gutterBottom>
                        Expiration
                    </Typography>

                    <DateTimePicker
                        label="Expires At"
                        value={expiresAt}
                        onChange={setExpiresAt}
                        slotProps={{ textField: { size: 'small', fullWidth: true } }}
                        sx={{ mb: 2 }}
                    />

                    {expiresAt && (
                        <Alert severity="info" sx={{ mb: 2 }}>
                            Access will automatically expire on {expiresAt.toLocaleString()}
                        </Alert>
                    )}
                </DialogContent>

                <DialogActions>
                    <Button onClick={handleShareDialogClose}>
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleShare}
                        disabled={!selectedUser || permissions.length === 0 || loading}
                        startIcon={<ShareIcon />}
                    >
                        Share
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Action buttons */}
            <Box sx={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 1,
                mt: 3
            }}>
                <Button onClick={onClose}>
                    Close
                </Button>
                <Button
                    variant="contained"
                    onClick={onSave}
                    startIcon={<SaveIcon />}
                >
                    Save Changes
                </Button>
            </Box>
        </Paper>
    );
};

export default AccessControlEditor;