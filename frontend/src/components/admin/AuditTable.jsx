import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Box,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TablePagination,
    TableSortLabel,
    Typography,
    Chip,
    IconButton,
    Tooltip,
    TextField,
    InputAdornment,
    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText,
    Divider,
    Alert,
    LinearProgress,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Stack,
    Select,
    FormControl,
    InputLabel,
    Grid,
    Avatar,
    Badge,
    Collapse,
    Card,
    CardContent
} from '@mui/material';
import {
    Search as SearchIcon,
    FilterList as FilterListIcon,
    Refresh as RefreshIcon,
    Download as DownloadIcon,
    Visibility as VisibilityIcon,
    ExpandMore as ExpandMoreIcon,
    ExpandLess as ExpandLessIcon,
    CheckCircle as CheckCircleIcon,
    Error as ErrorIcon,
    Warning as WarningIcon,
    Info as InfoIcon,
    Security as SecurityIcon,
    Person as PersonIcon,
    Description as DescriptionIcon,
    Chat as ChatIcon,
    Storage as StorageIcon
} from '@mui/icons-material';
import { DateTimePicker } from '@mui/x-date-pickers';
import { auditService } from '../../services/auditService';
import { formatDate, formatTime } from '../../utils/helpers';

const AuditTable = ({ onExport }) => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(25);
    const [totalLogs, setTotalLogs] = useState(0);
    const [sortBy, setSortBy] = useState('timestamp');
    const [sortOrder, setSortOrder] = useState('desc');
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState({
        action: '',
        resourceType: '',
        status: '',
        userId: '',
        startDate: null,
        endDate: null
    });
    const [filterMenu, setFilterMenu] = useState(null);
    const [selectedLog, setSelectedLog] = useState(null);
    const [detailDialogOpen, setDetailDialogOpen] = useState(false);
    const [expandedRows, setExpandedRows] = useState({});

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const result = await auditService.getAuditLogs({
                page: page + 1,
                limit: rowsPerPage,
                sortBy,
                sortOrder,
                search: searchTerm,
                ...filters
            });

            setLogs(result.logs);
            setTotalLogs(result.total);
        } catch (error) {
            console.error('Failed to fetch audit logs:', error);
            setError('Failed to load audit logs');
        } finally {
            setLoading(false);
        }
    }, [page, rowsPerPage, sortBy, sortOrder, searchTerm, filters]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    const handleSort = (column) => {
        if (sortBy === column) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(column);
            setSortOrder('desc');
        }
    };

    const handleSearch = (event) => {
        setSearchTerm(event.target.value);
        setPage(0);
    };

    const handleFilterMenuOpen = (event) => {
        setFilterMenu(event.currentTarget);
    };

    const handleFilterMenuClose = () => {
        setFilterMenu(null);
    };

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        setPage(0);
    };

    const handleClearFilters = () => {
        setFilters({
            action: '',
            resourceType: '',
            status: '',
            userId: '',
            startDate: null,
            endDate: null
        });
        setSearchTerm('');
        setPage(0);
    };

    const handleViewDetails = (log) => {
        setSelectedLog(log);
        setDetailDialogOpen(true);
    };

    const handleCloseDetails = () => {
        setDetailDialogOpen(false);
        setSelectedLog(null);
    };

    const handleToggleExpand = (logId) => {
        setExpandedRows(prev => ({
            ...prev,
            [logId]: !prev[logId]
        }));
    };

    const handleExport = async () => {
        if (onExport) {
            const data = await auditService.exportAuditLogs({
                ...filters,
                search: searchTerm
            });
            onExport(data);
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'success':
                return <CheckCircleIcon sx={{ color: 'success.main', fontSize: 20 }} />;
            case 'failure':
                return <ErrorIcon sx={{ color: 'error.main', fontSize: 20 }} />;
            case 'warning':
                return <WarningIcon sx={{ color: 'warning.main', fontSize: 20 }} />;
            default:
                return <InfoIcon sx={{ color: 'info.main', fontSize: 20 }} />;
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'success':
                return 'success';
            case 'failure':
                return 'error';
            case 'warning':
                return 'warning';
            default:
                return 'default';
        }
    };

    const getActionIcon = (action) => {
        if (action?.includes('DOCUMENT')) return <DescriptionIcon />;
        if (action?.includes('CHAT')) return <ChatIcon />;
        if (action?.includes('USER')) return <PersonIcon />;
        if (action?.includes('SECURITY')) return <SecurityIcon />;
        if (action?.includes('AUTH')) return <PersonIcon />;
        return <StorageIcon />;
    };

    const hasActiveFilters = useMemo(() => {
        return Object.values(filters).some(v => v !== '' && v !== null);
    }, [filters]);

    return (
        <Paper elevation={2} sx={{ width: '100%', overflow: 'hidden' }}>
            {/* Toolbar */}
            <Box sx={{
                p: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: 1,
                borderColor: 'divider',
                flexWrap: 'wrap',
                gap: 1
            }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TextField
                        size="small"
                        placeholder="Search audit logs..."
                        value={searchTerm}
                        onChange={handleSearch}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon />
                                </InputAdornment>
                            )
                        }}
                        sx={{ width: 250 }}
                    />

                    <Tooltip title="Filter">
                        <Badge
                            color="primary"
                            variant="dot"
                            invisible={!hasActiveFilters}
                        >
                            <IconButton onClick={handleFilterMenuOpen}>
                                <FilterListIcon />
                            </IconButton>
                        </Badge>
                    </Tooltip>

                    {hasActiveFilters && (
                        <Button size="small" onClick={handleClearFilters}>
                            Clear Filters
                        </Button>
                    )}
                </Box>

                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Tooltip title="Refresh">
                        <IconButton onClick={fetchLogs} disabled={loading}>
                            <RefreshIcon />
                        </IconButton>
                    </Tooltip>

                    <Tooltip title="Export">
                        <IconButton onClick={handleExport}>
                            <DownloadIcon />
                        </IconButton>
                    </Tooltip>
                </Box>
            </Box>

            {/* Active filters display */}
            {hasActiveFilters && (
                <Box sx={{
                    px: 2,
                    py: 1,
                    display: 'flex',
                    gap: 1,
                    flexWrap: 'wrap',
                    bgcolor: 'action.hover'
                }}>
                    {filters.action && (
                        <Chip
                            label={`Action: ${filters.action}`}
                            size="small"
                            onDelete={() => handleFilterChange('action', '')}
                        />
                    )}
                    {filters.resourceType && (
                        <Chip
                            label={`Resource: ${filters.resourceType}`}
                            size="small"
                            onDelete={() => handleFilterChange('resourceType', '')}
                        />
                    )}
                    {filters.status && (
                        <Chip
                            label={`Status: ${filters.status}`}
                            size="small"
                            onDelete={() => handleFilterChange('status', '')}
                        />
                    )}
                    {filters.startDate && (
                        <Chip
                            label={`From: ${formatDate(filters.startDate)}`}
                            size="small"
                            onDelete={() => handleFilterChange('startDate', null)}
                        />
                    )}
                    {filters.endDate && (
                        <Chip
                            label={`To: ${formatDate(filters.endDate)}`}
                            size="small"
                            onDelete={() => handleFilterChange('endDate', null)}
                        />
                    )}
                </Box>
            )}

            {/* Error alert */}
            {error && (
                <Alert severity="error" sx={{ m: 2 }} onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            {/* Loading indicator */}
            {loading && <LinearProgress />}

            {/* Table */}
            <TableContainer sx={{ maxHeight: 600 }}>
                <Table stickyHeader>
                    <TableHead>
                        <TableRow>
                            <TableCell padding="checkbox" />
                            <TableCell>
                                <TableSortLabel
                                    active={sortBy === 'timestamp'}
                                    direction={sortBy === 'timestamp' ? sortOrder : 'desc'}
                                    onClick={() => handleSort('timestamp')}
                                >
                                    Timestamp
                                </TableSortLabel>
                            </TableCell>
                            <TableCell>User</TableCell>
                            <TableCell>Action</TableCell>
                            <TableCell>Resource</TableCell>
                            <TableCell>
                                <TableSortLabel
                                    active={sortBy === 'status'}
                                    direction={sortBy === 'status' ? sortOrder : 'asc'}
                                    onClick={() => handleSort('status')}
                                >
                                    Status
                                </TableSortLabel>
                            </TableCell>
                            <TableCell>IP Address</TableCell>
                            <TableCell>Actions</TableCell>
                        </TableRow>
                    </TableHead>

                    <TableBody>
                        {logs.map((log) => (
                            <React.Fragment key={log.id}>
                                <TableRow hover>
                                    <TableCell padding="checkbox">
                                        <IconButton
                                            size="small"
                                            onClick={() => handleToggleExpand(log.id)}
                                        >
                                            {expandedRows[log.id] ?
                                                <ExpandLessIcon /> :
                                                <ExpandMoreIcon />
                                            }
                                        </IconButton>
                                    </TableCell>

                                    <TableCell>
                                        <Typography variant="body2">
                                            {formatDate(log.timestamp)}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {formatTime(log.timestamp)}
                                        </Typography>
                                    </TableCell>

                                    <TableCell>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Avatar sx={{ width: 24, height: 24, fontSize: '0.75rem' }}>
                                                {log.username?.[0]?.toUpperCase() || 'A'}
                                            </Avatar>
                                            <Typography variant="body2">
                                                {log.username || 'anonymous'}
                                            </Typography>
                                        </Box>
                                    </TableCell>

                                    <TableCell>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            {getActionIcon(log.action)}
                                            <Typography variant="body2">
                                                {log.action}
                                            </Typography>
                                        </Box>
                                    </TableCell>

                                    <TableCell>
                                        <Typography variant="body2">
                                            {log.resourceType}
                                            {log.resourceId && (
                                                <Typography variant="caption" color="text.secondary" display="block">
                                                    {log.resourceId.substring(0, 20)}...
                                                </Typography>
                                            )}
                                        </Typography>
                                    </TableCell>

                                    <TableCell>
                                        <Chip
                                            icon={getStatusIcon(log.status)}
                                            label={log.status}
                                            size="small"
                                            color={getStatusColor(log.status)}
                                            variant="outlined"
                                        />
                                    </TableCell>

                                    <TableCell>
                                        <Typography variant="body2">
                                            {log.ipAddress || 'N/A'}
                                        </Typography>
                                    </TableCell>

                                    <TableCell>
                                        <Tooltip title="View details">
                                            <IconButton
                                                size="small"
                                                onClick={() => handleViewDetails(log)}
                                            >
                                                <VisibilityIcon />
                                            </IconButton>
                                        </Tooltip>
                                    </TableCell>
                                </TableRow>

                                {/* Expanded row */}
                                {expandedRows[log.id] && (
                                    <TableRow>
                                        <TableCell colSpan={8} sx={{ bgcolor: 'action.hover' }}>
                                            <Box sx={{ p: 2 }}>
                                                <Typography variant="subtitle2" gutterBottom>
                                                    Log Details
                                                </Typography>
                                                <Grid container spacing={2}>
                                                    <Grid item xs={12} sm={6}>
                                                        <Typography variant="caption" color="text.secondary">
                                                            Request ID
                                                        </Typography>
                                                        <Typography variant="body2">
                                                            {log.requestId || 'N/A'}
                                                        </Typography>
                                                    </Grid>
                                                    <Grid item xs={12} sm={6}>
                                                        <Typography variant="caption" color="text.secondary">
                                                            Session ID
                                                        </Typography>
                                                        <Typography variant="body2">
                                                            {log.sessionId || 'N/A'}
                                                        </Typography>
                                                    </Grid>
                                                    <Grid item xs={12}>
                                                        <Typography variant="caption" color="text.secondary">
                                                            User Agent
                                                        </Typography>
                                                        <Typography variant="body2">
                                                            {log.userAgent || 'N/A'}
                                                        </Typography>
                                                    </Grid>
                                                    {log.details && Object.keys(log.details).length > 0 && (
                                                        <Grid item xs={12}>
                                                            <Typography variant="caption" color="text.secondary">
                                                                Details
                                                            </Typography>
                                                            <pre style={{
                                                                fontSize: '0.75rem',
                                                                overflow: 'auto',
                                                                maxHeight: 200,
                                                                padding: 8,
                                                                bgcolor: 'background.paper',
                                                                borderRadius: 1
                                                            }}>
                                                                {JSON.stringify(log.details, null, 2)}
                                                            </pre>
                                                        </Grid>
                                                    )}
                                                </Grid>
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </React.Fragment>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Pagination */}
            <TablePagination
                component="div"
                count={totalLogs}
                page={page}
                onPageChange={(e, newPage) => setPage(newPage)}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={(e) => {
                    setRowsPerPage(parseInt(e.target.value, 10));
                    setPage(0);
                }}
                rowsPerPageOptions={[10, 25, 50, 100]}
            />

            {/* Filter menu */}
            <Menu
                anchorEl={filterMenu}
                open={Boolean(filterMenu)}
                onClose={handleFilterMenuClose}
            >
                <Box sx={{ p: 2, width: 250 }}>
                    <Typography variant="subtitle2" gutterBottom>
                        Filters
                    </Typography>

                    <FormControl fullWidth size="small" sx={{ mb: 1 }}>
                        <InputLabel>Action</InputLabel>
                        <Select
                            value={filters.action}
                            onChange={(e) => handleFilterChange('action', e.target.value)}
                            label="Action"
                        >
                            <MenuItem value="">All</MenuItem>
                            <MenuItem value="LOGIN">Login</MenuItem>
                            <MenuItem value="LOGOUT">Logout</MenuItem>
                            <MenuItem value="DOCUMENT_CREATE">Document Create</MenuItem>
                            <MenuItem value="DOCUMENT_READ">Document Read</MenuItem>
                            <MenuItem value="DOCUMENT_UPDATE">Document Update</MenuItem>
                            <MenuItem value="DOCUMENT_DELETE">Document Delete</MenuItem>
                            <MenuItem value="CHAT_QUERY">Chat Query</MenuItem>
                            <MenuItem value="SECURITY_EVENT">Security Event</MenuItem>
                        </Select>
                    </FormControl>

                    <FormControl fullWidth size="small" sx={{ mb: 1 }}>
                        <InputLabel>Resource Type</InputLabel>
                        <Select
                            value={filters.resourceType}
                            onChange={(e) => handleFilterChange('resourceType', e.target.value)}
                            label="Resource Type"
                        >
                            <MenuItem value="">All</MenuItem>
                            <MenuItem value="document">Document</MenuItem>
                            <MenuItem value="chat">Chat</MenuItem>
                            <MenuItem value="user">User</MenuItem>
                            <MenuItem value="audit">Audit</MenuItem>
                            <MenuItem value="system">System</MenuItem>
                        </Select>
                    </FormControl>

                    <FormControl fullWidth size="small" sx={{ mb: 1 }}>
                        <InputLabel>Status</InputLabel>
                        <Select
                            value={filters.status}
                            onChange={(e) => handleFilterChange('status', e.target.value)}
                            label="Status"
                        >
                            <MenuItem value="">All</MenuItem>
                            <MenuItem value="success">Success</MenuItem>
                            <MenuItem value="failure">Failure</MenuItem>
                            <MenuItem value="warning">Warning</MenuItem>
                            <MenuItem value="error">Error</MenuItem>
                        </Select>
                    </FormControl>
                </Box>
            </Menu>

            {/* Detail dialog */}
            <Dialog
                open={detailDialogOpen}
                onClose={handleCloseDetails}
                maxWidth="md"
                fullWidth
            >
                {selectedLog && (
                    <>
                        <DialogTitle>
                            Audit Log Details
                        </DialogTitle>
                        <DialogContent>
                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={6}>
                                    <Typography variant="caption" color="text.secondary">
                                        Timestamp
                                    </Typography>
                                    <Typography variant="body2">
                                        {formatDate(selectedLog.timestamp)} {formatTime(selectedLog.timestamp)}
                                    </Typography>
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <Typography variant="caption" color="text.secondary">
                                        Request ID
                                    </Typography>
                                    <Typography variant="body2">
                                        {selectedLog.requestId}
                                    </Typography>
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <Typography variant="caption" color="text.secondary">
                                        User
                                    </Typography>
                                    <Typography variant="body2">
                                        {selectedLog.username}
                                    </Typography>
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <Typography variant="caption" color="text.secondary">
                                        Action
                                    </Typography>
                                    <Typography variant="body2">
                                        {selectedLog.action}
                                    </Typography>
                                </Grid>
                                <Grid item xs={12}>
                                    <Typography variant="caption" color="text.secondary">
                                        Details
                                    </Typography>
                                    <pre style={{
                                        fontSize: '0.75rem',
                                        overflow: 'auto',
                                        maxHeight: 300,
                                        padding: 16,
                                        bgcolor: '#f5f5f5',
                                        borderRadius: 4
                                    }}>
                                        {JSON.stringify(selectedLog.details, null, 2)}
                                    </pre>
                                </Grid>
                            </Grid>
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={handleCloseDetails}>Close</Button>
                        </DialogActions>
                    </>
                )}
            </Dialog>
        </Paper>
    );
};

export default AuditTable;