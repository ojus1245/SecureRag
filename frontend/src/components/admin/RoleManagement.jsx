import React, { useState, useEffect, useCallback } from 'react';
import {
    Box,
    Paper,
    Typography,
    Grid,
    Card,
    CardContent,
    CardHeader,
    Avatar,
    Chip,
    IconButton,
    Tooltip,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    FormGroup,
    FormControlLabel,
    Checkbox,
    Alert,
    LinearProgress,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    ListItemAvatar,
    Divider,
    Switch,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Stack
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Security as SecurityIcon,
    AdminPanelSettings as AdminIcon,
    ManageAccounts as ManagerIcon,
    Analytics as AnalystIcon,
    Visibility as ViewerIcon,
    Assessment as AuditorIcon,
    CheckCircle as CheckCircleIcon,
    Cancel as CancelIcon,
    Lock as LockIcon,
    LockOpen as LockOpenIcon
} from '@mui/icons-material';
import { roleService } from '../../services/roleService';
import { auditService } from '../../services/auditService';

const RoleManagement = () => {
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingRole, setEditingRole] = useState(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deletingRole, setDeletingRole] = useState(null);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        permissions: [],
        accessLevel: 1,
        isActive: true
    });

    const allPermissions = [
        { value: 'document:create', label: 'Create Documents', group: 'Documents' },
        { value: 'document:read', label: 'Read Documents', group: 'Documents' },
        { value: 'document:update', label: 'Update Documents', group: 'Documents' },
        { value: 'document:delete', label: 'Delete Documents', group: 'Documents' },
        { value: 'document:share', label: 'Share Documents', group: 'Documents' },
        { value: 'document:download', label: 'Download Documents', group: 'Documents' },
        { value: 'document:export', label: 'Export Documents', group: 'Documents' },
        { value: 'chat:query', label: 'Chat Query', group: 'Chat' },
        { value: 'chat:history', label: 'Chat History', group: 'Chat' },
        { value: 'chat:feedback', label: 'Chat Feedback', group: 'Chat' },
        { value: 'user:manage', label: 'Manage Users', group: 'Users' },
        { value: 'user:create', label: 'Create Users', group: 'Users' },
        { value: 'user:read', label: 'Read Users', group: 'Users' },
        { value: 'user:update', label: 'Update Users', group: 'Users' },
        { value: 'user:delete', label: 'Delete Users', group: 'Users' },
        { value: 'role:manage', label: 'Manage Roles', group: 'Roles' },
        { value: 'audit:view', label: 'View Audit Logs', group: 'Audit' },
        { value: 'audit:export', label: 'Export Audit Logs', group: 'Audit' },
        { value: 'system:configure', label: 'System Configuration', group: 'System' },
        { value: 'all:access', label: 'Full Access', group: 'System' }
    ];

    const permissionGroups = ['Documents', 'Chat', 'Users', 'Roles', 'Audit', 'System'];

    const fetchRoles = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const result = await roleService.getRoles();
            setRoles(result.roles || result);
        } catch (error) {
            console.error('Failed to fetch roles:', error);
            setError('Failed to load roles');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchRoles();
    }, [fetchRoles]);

    const handleOpenDialog = (role = null) => {
        setEditingRole(role);

        if (role) {
            setFormData({
                name: role.name,
                description: role.description,
                permissions: role.permissions || [],
                accessLevel: role.accessLevel || 1,
                isActive: role.isActive !== false
            });
        } else {
            setFormData({
                name: '',
                description: '',
                permissions: [],
                accessLevel: 1,
                isActive: true
            });
        }

        setDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setDialogOpen(false);
        setEditingRole(null);
    };

    const handleFormChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handlePermissionToggle = (permission) => {
        setFormData(prev => {
            const permissions = prev.permissions.includes(permission)
                ? prev.permissions.filter(p => p !== permission)
                : [...prev.permissions, permission];

            return { ...prev, permissions };
        });
    };

    const handleGroupToggle = (group) => {
        const groupPermissions = allPermissions
            .filter(p => p.group === group)
            .map(p => p.value);

        const allSelected = groupPermissions.every(p => formData.permissions.includes(p));

        setFormData(prev => {
            const permissions = allSelected
                ? prev.permissions.filter(p => !groupPermissions.includes(p))
                : [...new Set([...prev.permissions, ...groupPermissions])];

            return { ...prev, permissions };
        });
    };

    const handleSave = async () => {
        try {
            if (editingRole) {
                await roleService.updateRole(editingRole.id, formData);
                setSuccess('Role updated successfully');
            } else {
                await roleService.createRole(formData);
                setSuccess('Role created successfully');
            }

            setDialogOpen(false);
            fetchRoles();

            // Log audit event
            await auditService.logEvent({
                action: 'ROLE_UPDATE',
                resourceType: 'role',
                resourceId: editingRole?.id,
                details: {
                    name: formData.name,
                    permissions: formData.permissions.length,
                    accessLevel: formData.accessLevel
                },
                status: 'success'
            });
        } catch (error) {
            console.error('Failed to save role:', error);
            setError('Failed to save role');
        }
    };

    const handleOpenDeleteDialog = (role) => {
        setDeletingRole(role);
        setDeleteDialogOpen(true);
    };

    const handleCloseDeleteDialog = () => {
        setDeleteDialogOpen(false);
        setDeletingRole(null);
    };

    const handleDelete = async () => {
        try {
            await roleService.deleteRole(deletingRole.id);
            setSuccess('Role deleted successfully');
            setDeleteDialogOpen(false);
            fetchRoles();
        } catch (error) {
            console.error('Failed to delete role:', error);
            setError('Failed to delete role');
        }
    };

    const getRoleIcon = (roleName) => {
        switch (roleName) {
            case 'admin':
                return <AdminIcon />;
            case 'manager':
                return <ManagerIcon />;
            case 'analyst':
                return <AnalystIcon />;
            case 'viewer':
                return <ViewerIcon />;
            case 'auditor':
                return <AuditorIcon />;
            default:
                return <SecurityIcon />;
        }
    };

    const getRoleColor = (roleName) => {
        switch (roleName) {
            case 'admin':
                return 'primary';
            case 'manager':
                return 'secondary';
            case 'analyst':
                return 'info';
            case 'viewer':
                return 'success';
            case 'auditor':
                return 'warning';
            default:
                return 'default';
        }
    };

    return (
        <Box sx={{ p: 3 }}>
            {/* Header */}
            <Box sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 3
            }}>
                <Box>
                    <Typography variant="h5" gutterBottom>
                        Role Management
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Manage roles and permissions
                    </Typography>
                </Box>

                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => handleOpenDialog()}
                >
                    Add Role
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

            {/* Loading indicator */}
            {loading && <LinearProgress sx={{ mb: 2 }} />}

            {/* Roles grid */}
            <Grid container spacing={2}>
                {roles.map((role) => (
                    <Grid item xs={12} sm={6} md={4} key={role.id}>
                        <Card>
                            <CardHeader
                                avatar={
                                    <Avatar sx={{ bgcolor: `${getRoleColor(role.name)}.main` }}>
                                        {getRoleIcon(role.name)}
                                    </Avatar>
                                }
                                title={
                                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                        {role.name}
                                    </Typography>
                                }
                                subheader={`Level ${role.accessLevel}`}
                                action={
                                    <Box sx={{ display: 'flex' }}>
                                        <Tooltip title="Edit">
                                            <IconButton size="small" onClick={() => handleOpenDialog(role)}>
                                                <EditIcon />
                                            </IconButton>
                                        </Tooltip>
                                        {!role.isSystemRole && (
                                            <Tooltip title="Delete">
                                                <IconButton
                                                    size="small"
                                                    color="error"
                                                    onClick={() => handleOpenDeleteDialog(role)}
                                                >
                                                    <DeleteIcon />
                                                </IconButton>
                                            </Tooltip>
                                        )}
                                    </Box>
                                }
                            />

                            <CardContent>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                    {role.description}
                                </Typography>

                                <Divider sx={{ my: 1 }} />

                                <Typography variant="caption" color="text.secondary">
                                    Permissions: {role.permissions?.length || 0}
                                </Typography>

                                <Box sx={{
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    gap: 0.5,
                                    mt: 0.5
                                }}>
                                    {role.permissions?.slice(0, 5).map((permission) => (
                                        <Chip
                                            key={permission}
                                            label={permission}
                                            size="small"
                                            variant="outlined"
                                        />
                                    ))}
                                    {role.permissions?.length > 5 && (
                                        <Chip
                                            label={`+${role.permissions.length - 5} more`}
                                            size="small"
                                        />
                                    )}
                                </Box>

                                <Box sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 0.5,
                                    mt: 1
                                }}>
                                    {role.isSystemRole ? (
                                        <Chip
                                            icon={<LockIcon />}
                                            label="System Role"
                                            size="small"
                                            color="warning"
                                            variant="outlined"
                                        />
                                    ) : (
                                        <Chip
                                            icon={<LockOpenIcon />}
                                            label="Custom Role"
                                            size="small"
                                            color="info"
                                            variant="outlined"
                                        />
                                    )}

                                    <Chip
                                        icon={role.isActive ? <CheckCircleIcon /> : <CancelIcon />}
                                        label={role.isActive ? 'Active' : 'Inactive'}
                                        size="small"
                                        color={role.isActive ? 'success' : 'error'}
                                    />
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            {/* Add/Edit Role Dialog */}
            <Dialog
                open={dialogOpen}
                onClose={handleCloseDialog}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>
                    {editingRole ? 'Edit Role' : 'Add New Role'}
                </DialogTitle>

                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Role Name"
                                value={formData.name}
                                onChange={(e) => handleFormChange('name', e.target.value)}
                                size="small"
                                required
                                disabled={editingRole?.isSystemRole}
                            />
                        </Grid>

                        <Grid item xs={12} sm={6}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Access Level</InputLabel>
                                <Select
                                    value={formData.accessLevel}
                                    onChange={(e) => handleFormChange('accessLevel', e.target.value)}
                                    label="Access Level"
                                >
                                    {[1, 2, 3, 4, 5].map(level => (
                                        <MenuItem key={level} value={level}>Level {level}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>

                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Description"
                                value={formData.description}
                                onChange={(e) => handleFormChange('description', e.target.value)}
                                size="small"
                                multiline
                                rows={2}
                                required
                            />
                        </Grid>

                        <Grid item xs={12}>
                            <Typography variant="subtitle2" gutterBottom>
                                Permissions
                            </Typography>

                            {permissionGroups.map((group) => {
                                const groupPermissions = allPermissions.filter(p => p.group === group);
                                const allSelected = groupPermissions.every(p =>
                                    formData.permissions.includes(p.value)
                                );
                                const someSelected = groupPermissions.some(p =>
                                    formData.permissions.includes(p.value)
                                );

                                return (
                                    <Paper key={group} variant="outlined" sx={{ p: 1, mb: 1 }}>
                                        <FormControlLabel
                                            control={
                                                <Checkbox
                                                    checked={allSelected}
                                                    indeterminate={someSelected && !allSelected}
                                                    onChange={() => handleGroupToggle(group)}
                                                />
                                            }
                                            label={
                                                <Typography variant="subtitle2">
                                                    {group}
                                                </Typography>
                                            }
                                        />

                                        <FormGroup sx={{ ml: 4 }}>
                                            {groupPermissions.map((permission) => (
                                                <FormControlLabel
                                                    key={permission.value}
                                                    control={
                                                        <Checkbox
                                                            checked={formData.permissions.includes(permission.value)}
                                                            onChange={() => handlePermissionToggle(permission.value)}
                                                            size="small"
                                                        />
                                                    }
                                                    label={permission.label}
                                                />
                                            ))}
                                        </FormGroup>
                                    </Paper>
                                );
                            })}
                        </Grid>
                    </Grid>
                </DialogContent>

                <DialogActions>
                    <Button onClick={handleCloseDialog}>Cancel</Button>
                    <Button variant="contained" onClick={handleSave}>
                        {editingRole ? 'Update' : 'Create'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog
                open={deleteDialogOpen}
                onClose={handleCloseDeleteDialog}
            >
                <DialogTitle>Delete Role</DialogTitle>
                <DialogContent>
                    <Typography variant="body1">
                        Are you sure you want to delete role "{deletingRole?.name}"?
                        This action cannot be undone.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDeleteDialog}>Cancel</Button>
                    <Button
                        variant="contained"
                        color="error"
                        onClick={handleDelete}
                    >
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default RoleManagement;