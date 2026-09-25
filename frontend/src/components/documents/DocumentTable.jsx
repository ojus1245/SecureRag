import React, { useState, useEffect, useCallback } from 'react';
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
    Checkbox,
    IconButton,
    Tooltip,
    Typography,
    Chip,
    Avatar,
    TextField,
    InputAdornment,
    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText,
    Divider,
    Button,
    Alert,
    LinearProgress,
    Skeleton
} from '@mui/material';
import {
    Search as SearchIcon,
    Delete as DeleteIcon,
    Edit as EditIcon,
    Share as ShareIcon,
    Download as DownloadIcon,
    MoreVert as MoreVertIcon,
    Visibility as VisibilityIcon,
    FilterList as FilterListIcon,
    Sort as SortIcon,
    Security as SecurityIcon,
    Description as DescriptionIcon
} from '@mui/icons-material';
import { documentService } from '../../services/documentService';
import { auditService } from '../../services/auditService';
import SensitivityBadge from './SensitivityBadge';
import { formatDate, formatFileSize } from '../../utils/helpers';

const DocumentTable = ({
    onDocumentClick,
    onEditDocument,
    onShareDocument,
    onDeleteDocument,
    onDownloadDocument
}) => {
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(20);
    const [totalDocuments, setTotalDocuments] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const [selected, setSelected] = useState([]);
    const [sortBy, setSortBy] = useState('createdAt');
    const [sortOrder, setSortOrder] = useState('desc');
    const [filterMenu, setFilterMenu] = useState(null);
    const [actionMenu, setActionMenu] = useState(null);
    const [actionDocument, setActionDocument] = useState(null);

    const fetchDocuments = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const result = await documentService.getDocuments({
                page: page + 1,
                limit: rowsPerPage,
                search: searchTerm,
                sortBy,
                sortOrder
            });

            // Handle different response shapes
            const docs = result?.documents || result || [];
            setDocuments(Array.isArray(docs) ? docs : []);
            setTotalDocuments(result?.pagination?.total || result?.total || docs.length || 0);
        } catch (error) {
            console.error('Failed to fetch documents:', error);
            setError('Failed to load documents');
        } finally {
            setLoading(false);
        }
    }, [page, rowsPerPage, searchTerm, sortBy, sortOrder]);

    useEffect(() => {
        fetchDocuments();
    }, [fetchDocuments]);

    const handleSort = (column) => {
        if (sortBy === column) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(column);
            setSortOrder('asc');
        }
    };

    const handleSearch = (event) => {
        setSearchTerm(event.target.value);
        setPage(0);
    };

    const handleSelectAll = (event) => {
        if (event.target.checked) {
            setSelected(documents.map(doc => doc.id || doc._id));
        } else {
            setSelected([]);
        }
    };

    const handleSelect = (id) => {
        const selectedIndex = selected.indexOf(id);
        let newSelected = [];

        if (selectedIndex === -1) {
            newSelected = [...selected, id];
        } else {
            newSelected = selected.filter(item => item !== id);
        }

        setSelected(newSelected);
    };

    const handleActionMenuOpen = (event, document) => {
        setActionMenu(event.currentTarget);
        setActionDocument(document);
    };

    const handleActionMenuClose = () => {
        setActionMenu(null);
        setActionDocument(null);
    };

    const handleFilterMenuOpen = (event) => {
        setFilterMenu(event.currentTarget);
    };

    const handleFilterMenuClose = () => {
        setFilterMenu(null);
    };

    const handleBulkDelete = async () => {
        if (selected.length === 0) return;

        try {
            await documentService.bulkDeleteDocuments(selected);

            await auditService.logEvent({
                action: 'DOCUMENT_DELETE',
                resourceType: 'document',
                details: {
                    count: selected.length,
                    documentIds: selected
                },
                status: 'success'
            });

            setSelected([]);
            fetchDocuments();
        } catch (error) {
            console.error('Bulk delete failed:', error);
        }
    };

    const isSelected = (id) => selected.indexOf(id) !== -1;

    const columns = [
        { id: 'title', label: 'Title', minWidth: 200 },
        { id: 'classification', label: 'Classification', minWidth: 120 },
        { id: 'department', label: 'Department', minWidth: 120 },
        { id: 'owner', label: 'Owner', minWidth: 100 },
        { id: 'tags', label: 'Tags', minWidth: 150 },
        { id: 'createdAt', label: 'Created', minWidth: 120 },
        { id: 'actions', label: 'Actions', minWidth: 80 }
    ];

    return (
        <Paper elevation={2} sx={{ width: '100%', overflow: 'hidden' }}>
            {/* Toolbar */}
            <Box sx={{
                p: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: 1,
                borderColor: 'divider'
            }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <TextField
                        size="small"
                        placeholder="Search documents..."
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

                    <Tooltip title="Filter">
                        <IconButton onClick={handleFilterMenuOpen}>
                            <FilterListIcon />
                        </IconButton>
                    </Tooltip>
                </Box>

                {selected.length > 0 && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                            {selected.length} selected
                        </Typography>
                        <Button
                            size="small"
                            color="error"
                            startIcon={<DeleteIcon />}
                            onClick={handleBulkDelete}
                        >
                            Delete
                        </Button>
                    </Box>
                )}
            </Box>

            {error && (
                <Alert severity="error" sx={{ m: 2 }} onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            {loading && <LinearProgress />}

            <TableContainer sx={{ maxHeight: 600 }}>
                <Table stickyHeader>
                    <TableHead>
                        <TableRow>
                            <TableCell padding="checkbox">
                                <Checkbox
                                    checked={selected.length === documents.length && documents.length > 0}
                                    indeterminate={selected.length > 0 && selected.length < documents.length}
                                    onChange={handleSelectAll}
                                />
                            </TableCell>

                            {columns.map((column) => (
                                <TableCell
                                    key={column.id}
                                    style={{ minWidth: column.minWidth }}
                                >
                                    {column.id !== 'actions' && column.id !== 'tags' ? (
                                        <TableSortLabel
                                            active={sortBy === column.id}
                                            direction={sortBy === column.id ? sortOrder : 'asc'}
                                            onClick={() => handleSort(column.id)}
                                        >
                                            {column.label}
                                        </TableSortLabel>
                                    ) : (
                                        column.label
                                    )}
                                </TableCell>
                            ))}
                        </TableRow>
                    </TableHead>

                    <TableBody>
                        {loading ? (
                            Array.from({ length: 5 }).map((_, index) => (
                                <TableRow key={`skeleton-${index}`}>
                                    <TableCell padding="checkbox">
                                        <Skeleton variant="rectangular" width={20} height={20} />
                                    </TableCell>
                                    {columns.map((column) => (
                                        <TableCell key={`skeleton-${column.id}`}>
                                            <Skeleton variant="text" />
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : documents.length === 0 ? (
                            <TableRow key="empty-row">
                                <TableCell colSpan={columns.length + 1} align="center">
                                    <Box sx={{ py: 4 }}>
                                        <DescriptionIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                                        <Typography variant="body1" color="text.secondary">
                                            No documents found
                                        </Typography>
                                    </Box>
                                </TableCell>
                            </TableRow>
                        ) : (
                            documents.map((document, index) => {
                                // FIXED: Unique key per row
                                const docId = document.id || document._id || `doc-${index}`;
                                const isItemSelected = isSelected(docId);

                                return (
                                    <TableRow
                                        key={docId}
                                        hover
                                        selected={isItemSelected}
                                        onClick={() => onDocumentClick?.(document)}
                                        sx={{ cursor: 'pointer' }}
                                    >
                                        <TableCell padding="checkbox">
                                            <Checkbox
                                                checked={isItemSelected}
                                                onChange={(e) => {
                                                    e.stopPropagation();
                                                    handleSelect(docId);
                                                }}
                                            />
                                        </TableCell>

                                        <TableCell>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <DescriptionIcon color="primary" sx={{ fontSize: 20 }} />
                                                <Box>
                                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                        {document.title}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        v{document.version || 1} • {formatFileSize(document.fileSize || 0)}
                                                    </Typography>
                                                </Box>
                                            </Box>
                                        </TableCell>

                                        <TableCell>
                                            <SensitivityBadge level={document.classification} />
                                        </TableCell>

                                        <TableCell>
                                            <Typography variant="body2">
                                                {document.department}
                                            </Typography>
                                        </TableCell>

                                        <TableCell>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <Avatar sx={{ width: 24, height: 24, fontSize: '0.75rem' }}>
                                                    {document.owner?.username?.[0]?.toUpperCase() || 'U'}
                                                </Avatar>
                                                <Typography variant="body2">
                                                    {document.owner?.username || 'Unknown'}
                                                </Typography>
                                            </Box>
                                        </TableCell>

                                        <TableCell>
                                            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                                {document.tags?.slice(0, 3).map((tag, tagIndex) => (
                                                    <Chip
                                                        key={`${docId}-tag-${tagIndex}`}
                                                        label={tag}
                                                        size="small"
                                                        variant="outlined"
                                                    />
                                                ))}
                                                {document.tags?.length > 3 && (
                                                    <Chip
                                                        key={`${docId}-more-tags`}
                                                        label={`+${document.tags.length - 3}`}
                                                        size="small"
                                                    />
                                                )}
                                            </Box>
                                        </TableCell>

                                        <TableCell>
                                            <Typography variant="body2">
                                                {formatDate(document.createdAt)}
                                            </Typography>
                                        </TableCell>

                                        <TableCell>
                                            <IconButton
                                                size="small"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleActionMenuOpen(e, document);
                                                }}
                                            >
                                                <MoreVertIcon />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            <TablePagination
                component="div"
                count={totalDocuments}
                page={page}
                onPageChange={(e, newPage) => setPage(newPage)}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={(e) => {
                    setRowsPerPage(parseInt(e.target.value, 10));
                    setPage(0);
                }}
                rowsPerPageOptions={[10, 20, 50, 100]}
            />

            <Menu
                anchorEl={filterMenu}
                open={Boolean(filterMenu)}
                onClose={handleFilterMenuClose}
            >
                <MenuItem>
                    <ListItemIcon><SecurityIcon fontSize="small" /></ListItemIcon>
                    <ListItemText>Classification</ListItemText>
                </MenuItem>
                <MenuItem>
                    <ListItemIcon><FilterListIcon fontSize="small" /></ListItemIcon>
                    <ListItemText>Department</ListItemText>
                </MenuItem>
                <MenuItem>
                    <ListItemIcon><SortIcon fontSize="small" /></ListItemIcon>
                    <ListItemText>Status</ListItemText>
                </MenuItem>
            </Menu>

            <Menu
                anchorEl={actionMenu}
                open={Boolean(actionMenu)}
                onClose={handleActionMenuClose}
            >
                <MenuItem onClick={() => { onDocumentClick?.(actionDocument); handleActionMenuClose(); }}>
                    <ListItemIcon><VisibilityIcon fontSize="small" /></ListItemIcon>
                    <ListItemText>View</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => { onEditDocument?.(actionDocument); handleActionMenuClose(); }}>
                    <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
                    <ListItemText>Edit</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => { onShareDocument?.(actionDocument); handleActionMenuClose(); }}>
                    <ListItemIcon><ShareIcon fontSize="small" /></ListItemIcon>
                    <ListItemText>Share</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => { onDownloadDocument?.(actionDocument); handleActionMenuClose(); }}>
                    <ListItemIcon><DownloadIcon fontSize="small" /></ListItemIcon>
                    <ListItemText>Download</ListItemText>
                </MenuItem>
                <Divider />
                <MenuItem onClick={() => { onDeleteDocument?.(actionDocument); handleActionMenuClose(); }}>
                    <ListItemIcon><DeleteIcon fontSize="small" color="error" /></ListItemIcon>
                    <ListItemText sx={{ color: 'error.main' }}>Delete</ListItemText>
                </MenuItem>
            </Menu>
        </Paper>
    );
};

export default DocumentTable;