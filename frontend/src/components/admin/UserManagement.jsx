import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Box,
    Paper,
    Typography,
    Grid,
    Card,
    CardContent,
    Avatar,
    Chip,
    IconButton,
    Tooltip,
    Button,
    TextField,
    InputAdornment,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Alert,
    LinearProgress,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TablePagination,
    Switch,
    FormControlLabel,
    Divider,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    Stack
} from '@mui/material';
import {
    Search as SearchIcon,
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Block as BlockIcon,
    CheckCircle as CheckCircleIcon,
    Cancel as CancelIcon,
    Person as PersonIcon,
    Security as SecurityIcon,
    Refresh as RefreshIcon,
    FilterList as FilterListIcon,
    Lock as LockIcon,
    LockOpen as LockOpenIcon
} from '@mui/icons-material';
import { userService } from '../../services/userService';
import { auditService } from '../../services/auditService';
import { useAuth } from '../../hooks/useAuth';

const UserManagement = () => {
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(20);
    const [totalUsers, setTotalUsers] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deletingUser, setDeletingUser] = useState(null);

    // Form state
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        fullName: '',
        department: '',
        securityClearance: 'internal',
        role: 'viewer',
        isActive: true
    });

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const result = await userService.getUsers({
                page: page + 1,
                limit: rowsPerPage,
                search: searchTerm
            });

            // Handle both { data: { users, pagination } } and { users, total }
            const usersData = result?.data?.users || result?.users || [];
            const totalCount = result?.data?.pagination?.total ?? result?.total ?? usersData.length;

            setUsers(Array.isArray(usersData) ? usersData : []);
            setTotalUsers(totalCount);
        } catch (error) {
            console.error('Failed to fetch users:', error);
            setError('Failed to load users');
            setUsers([]);
        } finally {
            setLoading(false);
        }
    }, [page, rowsPerPage, searchTerm]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const handleSearch = (event) => {
        setSearchTerm(event.target.value);
        setPage(0);
    };

    const handleOpenDialog = (user = null) => {
        setEditingUser(user);

        if (user) {
            setFormData({
                username: user.username,
                email: user.email,
                fullName: user.fullName,
                department: user.department,
                securityClearance: user.securityClearance,
                role: user.role?.name || 'viewer',
                isActive: user.isActive
            });
        } else {
            setFormData({
                username: '',
                email: '',
                fullName: '',
                department: '',
                securityClearance: 'internal',
                role: 'viewer',
                isActive: true
            });
        }

        setDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setDialogOpen(false);
        setEditingUser(null);
    };

    const handleFormChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = async () => {
        try {
            const editId = editingUser?.id || editingUser?._id;
            if (editingUser) {
                await userService.updateUser(editId, formData);
                setSuccess('User updated successfully');
            } else {
                await userService.createUser({
                    ...formData,
                    password: 'Temp@123456'
                });
                setSuccess('User created successfully');
            }

            setDialogOpen(false);
            fetchUsers();

            // Log audit event
            await auditService.logEvent({
                action: editingUser ? 'USER_UPDATE' : 'USER_CREATE',
                resourceType: 'user',
                resourceId: editId,
                details: {
                    username: formData.username,
                    department: formData.department,
                    securityClearance: formData.securityClearance
                },
                status: 'success'
            });
        } catch (error) {
            console.error('Failed to save user:', error);
            setError('Failed to save user');
        }
    };

    const handleOpenDeleteDialog = (user) => {
        setDeletingUser(user);
        setDeleteDialogOpen(true);
    };

    const handleCloseDeleteDialog = () => {
        setDeleteDialogOpen(false);
        setDeletingUser(null);
    };

    const handleDelete = async () => {
        try {
            const delId = deletingUser?.id || deletingUser?._id;
            await userService.deleteUser(delId);
            setSuccess('User deactivated successfully');
            setDeleteDialogOpen(false);
            fetchUsers();

            // Log audit event
            await auditService.logEvent({
                action: 'USER_DELETE',
                resourceType: 'user',
                resourceId: delId,
                details: {
                    username: deletingUser?.username
                },
                status: 'success'
            });
        } catch (error) {
            console.error('Failed to delete user:', error);
            setError('Failed to delete user');
        }
    };

    const handleToggleActive = async (user) => {
        try {
            const toggleId = user.id || user._id;
            await userService.updateUser(toggleId, {
                ...user,
                isActive: !user.isActive
            });
            setSuccess(`User ${user.isActive ? 'deactivated' : 'activated'} successfully`);
            fetchUsers();
        } catch (error) {
            console.error('Failed to toggle user:', error);
            setError('Failed to update user status');
        }
    };

    const departments = ['IT', 'HR', 'Finance', 'Marketing', 'Sales', 'Operations'];
    const roles = ['admin', 'manager', 'analyst', 'viewer', 'auditor'];
    const clearances = ['public', 'internal', 'confidential', 'restricted'];

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
                        User Management
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Manage users and their access levels
                    </Typography>
                </Box>

                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => handleOpenDialog()}
                >
                    Add User
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

            {/* Search */}
            <Paper sx={{ p: 2, mb: 2 }}>
                <TextField
                    size="small"
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={handleSearch}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon />
                            </InputAdornment>
                        )
                    }}
                    sx={{ width: 300 }}
                />
            </Paper>

            {/* Loading indicator */}
            {loading && <LinearProgress sx={{ mb: 2 }} />}

            {/* Users table */}
            <Paper elevation={2}>
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>User</TableCell>
                                <TableCell>Department</TableCell>
                                <TableCell>Role</TableCell>
                                <TableCell>Clearance</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Last Login</TableCell>
                                <TableCell>Actions</TableCell>
                            </TableRow>
                        </TableHead>

                        <TableBody>
                            {users && users.length > 0 ? (
                                users.map((user) => {
                                    const userId = user.id || user._id;
                                    return (
                                        <TableRow key={userId} hover>
                                            <TableCell>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <Avatar sx={{ width: 32, height: 32 }}>
                                                        {user.fullName?.[0]?.toUpperCase() || user.username?.[0]?.toUpperCase()}
                                                    </Avatar>
                                                    <Box>
                                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                            {user.fullName || user.username}
                                                        </Typography>
                                                        <Typography variant="caption" color="text.secondary">
                                                            {user.email}
                                                        </Typography>
                                                    </Box>
                                                </Box>
                                            </TableCell>

                                            <TableCell>
                                                <Typography variant="body2">
                                                    {user.department || 'N/A'}
                                                </Typography>
                                            </TableCell>

                                            <TableCell>
                                                <Chip
                                                    label={user.role?.name || (typeof user.role === 'string' ? user.role : 'viewer')}
                                                    size="small"
                                                    color={user.role?.name === 'admin' || user.role === 'admin' ? 'primary' : 'default'}
                                                    variant="outlined"
                                                />
                                            </TableCell>

                                            <TableCell>
                                                <Chip
                                                    label={user.securityClearance || 'internal'}
                                                    size="small"
                                                    color={
                                                        user.securityClearance === 'restricted' ? 'error' :
                                                            user.securityClearance === 'confidential' ? 'warning' :
                                                                user.securityClearance === 'internal' ? 'info' : 'success'
                                                    }
                                                    variant="outlined"
                                                />
                                            </TableCell>

                                            <TableCell>
                                                <Chip
                                                    icon={user.isActive ? <CheckCircleIcon /> : <CancelIcon />}
                                                    label={user.isActive ? 'Active' : 'Inactive'}
                                                    size="small"
                                                    color={user.isActive ? 'success' : 'error'}
                                                />
                                            </TableCell>

                                            <TableCell>
                                                <Typography variant="body2">
                                                    {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                                                </Typography>
                                            </TableCell>

                                            <TableCell>
                                                <Box sx={{ display: 'flex', gap: 0.5 }}>
                                                    <Tooltip title="Edit">
                                                        <IconButton size="small" onClick={() => handleOpenDialog(user)}>
                                                            <EditIcon />
                                                        </IconButton>
                                                    </Tooltip>

                                                    <Tooltip title={user.isActive ? 'Deactivate' : 'Activate'}>
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => handleToggleActive(user)}
                                                            disabled={userId === (currentUser?.id || currentUser?._id)}
                                                        >
                                                            {user.isActive ? <BlockIcon /> : <CheckCircleIcon />}
                                                        </IconButton>
                                                    </Tooltip>

                                                    <Tooltip title="Delete">
                                                        <IconButton
                                                            size="small"
                                                            color="error"
                                                            onClick={() => handleOpenDeleteDialog(user)}
                                                            disabled={userId === (currentUser?.id || currentUser?._id)}
                                                        >
                                                            <DeleteIcon />
                                                        </IconButton>
                                                    </Tooltip>
                                                </Box>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={7} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                                        {loading ? 'Loading users...' : 'No users found'}
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>

                <TablePagination
                    component="div"
                    count={totalUsers}
                    page={page}
                    onPageChange={(e, newPage) => setPage(newPage)}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={(e) => {
                        setRowsPerPage(parseInt(e.target.value, 10));
                        setPage(0);
                    }}
                    rowsPerPageOptions={[10, 20, 50]}
                />
            </Paper>

            {/* Add/Edit User Dialog */}
            <Dialog
                open={dialogOpen}
                onClose={handleCloseDialog}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>
                    {editingUser ? 'Edit User' : 'Add New User'}
                </DialogTitle>

                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Username"
                                value={formData.username}
                                onChange={(e) => handleFormChange('username', e.target.value)}
                                size="small"
                                required
                                disabled={!!editingUser}
                            />
                        </Grid>

                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Email"
                                type="email"
                                value={formData.email}
                                onChange={(e) => handleFormChange('email', e.target.value)}
                                size="small"
                                required
                            />
                        </Grid>

                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Full Name"
                                value={formData.fullName}
                                onChange={(e) => handleFormChange('fullName', e.target.value)}
                                size="small"
                                required
                            />
                        </Grid>

                        <Grid item xs={12} sm={6}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Department</InputLabel>
                                <Select
                                    value={formData.department}
                                    onChange={(e) => handleFormChange('department', e.target.value)}
                                    label="Department"
                                >
                                    {departments.map(dept => (
                                        <MenuItem key={dept} value={dept}>{dept}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>

                        <Grid item xs={12} sm={6}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Role</InputLabel>
                                <Select
                                    value={formData.role}
                                    onChange={(e) => handleFormChange('role', e.target.value)}
                                    label="Role"
                                >
                                    {roles.map(role => (
                                        <MenuItem key={role} value={role}>{role}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>

                        <Grid item xs={12} sm={6}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Security Clearance</InputLabel>
                                <Select
                                    value={formData.securityClearance}
                                    onChange={(e) => handleFormChange('securityClearance', e.target.value)}
                                    label="Security Clearance"
                                >
                                    {clearances.map(clearance => (
                                        <MenuItem key={clearance} value={clearance}>{clearance}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>

                        {editingUser && (
                            <Grid item xs={12}>
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={formData.isActive}
                                            onChange={(e) => handleFormChange('isActive', e.target.checked)}
                                        />
                                    }
                                    label="Active"
                                />
                            </Grid>
                        )}
                    </Grid>
                </DialogContent>

                <DialogActions>
                    <Button onClick={handleCloseDialog}>Cancel</Button>
                    <Button variant="contained" onClick={handleSave}>
                        {editingUser ? 'Update' : 'Create'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog
                open={deleteDialogOpen}
                onClose={handleCloseDeleteDialog}
            >
                <DialogTitle>Deactivate User</DialogTitle>
                <DialogContent>
                    <Typography variant="body1">
                        Are you sure you want to deactivate user "{deletingUser?.username}"?
                        This action can be reversed.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDeleteDialog}>Cancel</Button>
                    <Button
                        variant="contained"
                        color="error"
                        onClick={handleDelete}
                    >
                        Deactivate
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default UserManagement;