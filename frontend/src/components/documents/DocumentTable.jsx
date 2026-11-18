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
    Button,
    LinearProgress,
    Skeleton,
    Alert,
    Divider
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
    Description as DescriptionIcon,
    Chat as ChatIcon,
    Star as StarIcon,
    StarBorder as StarBorderIcon,
    Archive as ArchiveIcon,
    Unarchive as UnarchiveIcon
} from '@mui/icons-material';
import { documentService } from '../../services/documentService';
import { auditService } from '../../services/auditService';
import { useAuth } from '../../hooks/useAuth';
import SensitivityBadge from './SensitivityBadge';
import { formatDate, formatFileSize } from '../../utils/helpers';

const DocumentTable = ({
    tab = 'all',
    onDocumentClick,
    onChatDocument,
    onEditDocument,
    onShareDocument,
    onDeleteDocument,
    onDownloadDocument,
    onToggleFavorite,
    onToggleArchive
}) => {
    const { user } = useAuth();
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
            const params = {
                page: page + 1,
                limit: rowsPerPage,
                search: searchTerm,
                sortBy,
                sortOrder
            };

            // Map frontend tab to backend query
            if (tab === 'archived') {
                params.status = 'archived';
            } else if (tab === 'favorites') {
                params.favorite = 'true';
            } else if (tab === 'my') {
                params.tab = 'my';
            } else if (tab === 'shared') {
                params.tab = 'shared';
            } else {
                params.status = 'published';
            }

            const result = await documentService.getDocuments(params);

            const docs = result?.documents || result || [];
            setDocuments(Array.isArray(docs) ? docs : []);
            setTotalDocuments(result?.pagination?.total || result?.total || docs.length || 0);
        } catch (error) {
            console.error('Failed to fetch documents:', error);
            setError('Failed to load documents');
        } finally {
            setLoading(false);
        }
    }, [page, rowsPerPage, searchTerm, sortBy, sortOrder, tab]);

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

    const handleInlineFavorite = async (e, doc) => {
        e.stopPropagation();
        const docId = doc.id || doc._id;
        try {
            await documentService.toggleFavorite(docId);
            fetchDocuments();
            if (onToggleFavorite) onToggleFavorite(doc);
        } catch (err) {
            console.error('Failed to toggle favorite:', err);
        }
    };

    const handleInlineArchive = async (e, doc) => {
        e.stopPropagation();
        const docId = doc.id || doc._id;
        try {
            await documentService.toggleArchive(docId);
            fetchDocuments();
            if (onToggleArchive) onToggleArchive(doc);
        } catch (err) {
            console.error('Failed to toggle archive:', err);
        }
    };

    const isSelected = (id) => selected.indexOf(id) !== -1;

    const currentUserId = user?.id || user?._id;

    const columns = [
        { id: 'favorite', label: '', minWidth: 40 },
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
                flexWrap: 'wrap',
                gap: 2
            }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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
                                    {column.id !== 'actions' && column.id !== 'tags' && column.id !== 'favorite' ? (
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
                                    <Box sx={{ py: 6, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                        {tab === 'archived' ? (
                                            <>
                                                <ArchiveIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1.5 }} />
                                                <Typography variant="h6" color="text.secondary">
                                                    No archived documents
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    Documents you archive will appear here safely stored away from the active list.
                                                </Typography>
                                            </>
                                        ) : tab === 'favorites' ? (
                                            <>
                                                <StarIcon sx={{ fontSize: 48, color: 'warning.main', mb: 1.5 }} />
                                                <Typography variant="h6" color="text.secondary">
                                                    No favorite documents
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    Click the star icon on any document to add it to your quick-access favorites.
                                                </Typography>
                                            </>
                                        ) : (
                                            <>
                                                <DescriptionIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1.5 }} />
                                                <Typography variant="h6" color="text.secondary">
                                                    No documents found
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    Upload your first document or refine your search query.
                                                </Typography>
                                            </>
                                        )}
                                    </Box>
                                </TableCell>
                            </TableRow>
                        ) : (
                            documents.map((document, index) => {
                                const docId = document.id || document._id || `doc-${index}`;
                                const isItemSelected = isSelected(docId);
                                const isFav = Array.isArray(document.metadata?.favorites) && 
                                    document.metadata.favorites.includes(currentUserId?.toString());
                                const isArchived = document.status === 'archived';

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

                                        {/* Favorite star */}
                                        <TableCell sx={{ width: 40, p: 0.5 }}>
                                            <Tooltip title={isFav ? 'Remove from favorites' : 'Add to favorites'}>
                                                <IconButton
                                                    size="small"
                                                    onClick={(e) => handleInlineFavorite(e, document)}
                                                    sx={{ color: isFav ? 'warning.main' : 'text.disabled' }}
                                                >
                                                    {isFav ? <StarIcon fontSize="small" /> : <StarBorderIcon fontSize="small" />}
                                                </IconButton>
                                            </Tooltip>
                                        </TableCell>

                                        <TableCell>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <DescriptionIcon color={isArchived ? 'disabled' : 'primary'} sx={{ fontSize: 20 }} />
                                                <Box>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                            {document.title}
                                                        </Typography>
                                                        {isArchived && (
                                                            <Chip label="Archived" size="small" color="warning" variant="outlined" sx={{ height: 20, fontSize: '0.65rem' }} />
                                                        )}
                                                    </Box>
                                                    <Typography variant="caption" color="text.secondary">
                                                        v{document.version || 1} • {formatFileSize(document.fileSize || 0)} • {document.fileType?.toUpperCase() || 'TXT'}
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
                <MenuItem onClick={() => {
                    const doc = actionDocument;
                    handleActionMenuClose();
                    if (doc) onDocumentClick?.(doc);
                }}>
                    <ListItemIcon><VisibilityIcon fontSize="small" color="primary" /></ListItemIcon>
                    <ListItemText>View Document</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => {
                    const doc = actionDocument;
                    handleActionMenuClose();
                    if (doc) onChatDocument?.(doc);
                }}>
                    <ListItemIcon><ChatIcon fontSize="small" color="secondary" /></ListItemIcon>
                    <ListItemText sx={{ fontWeight: 600 }}>Chat with Document</ListItemText>
                </MenuItem>
                <MenuItem onClick={(e) => {
                    const doc = actionDocument;
                    handleActionMenuClose();
                    if (doc) handleInlineFavorite(e, doc);
                }}>
                    <ListItemIcon><StarIcon fontSize="small" color="warning" /></ListItemIcon>
                    <ListItemText>
                        {actionDocument?.metadata?.favorites?.includes(currentUserId?.toString())
                            ? 'Remove Favorite'
                            : 'Add to Favorites'}
                    </ListItemText>
                </MenuItem>
                <MenuItem onClick={(e) => {
                    const doc = actionDocument;
                    handleActionMenuClose();
                    if (doc) handleInlineArchive(e, doc);
                }}>
                    <ListItemIcon>
                        {actionDocument?.status === 'archived' ? <UnarchiveIcon fontSize="small" /> : <ArchiveIcon fontSize="small" />}
                    </ListItemIcon>
                    <ListItemText>
                        {actionDocument?.status === 'archived' ? 'Unarchive' : 'Archive'}
                    </ListItemText>
                </MenuItem>
                <MenuItem onClick={() => {
                    const doc = actionDocument;
                    handleActionMenuClose();
                    if (doc) onEditDocument?.(doc);
                }}>
                    <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
                    <ListItemText>Edit</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => {
                    const doc = actionDocument;
                    handleActionMenuClose();
                    if (doc) onShareDocument?.(doc);
                }}>
                    <ListItemIcon><ShareIcon fontSize="small" /></ListItemIcon>
                    <ListItemText>Share</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => {
                    const doc = actionDocument;
                    handleActionMenuClose();
                    if (doc) onDownloadDocument?.(doc);
                }}>
                    <ListItemIcon><DownloadIcon fontSize="small" /></ListItemIcon>
                    <ListItemText>Download</ListItemText>
                </MenuItem>
                <Divider />
                <MenuItem onClick={() => {
                    const doc = actionDocument;
                    handleActionMenuClose();
                    if (doc) onDeleteDocument?.(doc);
                }}>
                    <ListItemIcon><DeleteIcon fontSize="small" color="error" /></ListItemIcon>
                    <ListItemText sx={{ color: 'error.main' }}>Delete</ListItemText>
                </MenuItem>
            </Menu>
        </Paper>
    );
};

export default DocumentTable;
