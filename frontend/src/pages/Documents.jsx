import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import {
    Box,
    Paper,
    Typography,
    Button,
    IconButton,
    Tooltip,
    Chip,
    Tabs,
    Tab,
    Alert,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Grid,
    Card,
    CardContent,
    CardActions,
    Avatar,
    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText,
    Divider,
    CircularProgress,
    LinearProgress,
    Badge,
    Snackbar,
    Select,
    FormControl,
    InputLabel
} from '@mui/material';
import {
    Add as AddIcon,
    Upload as UploadIcon,
    Search as SearchIcon,
    FilterList as FilterListIcon,
    Sort as SortIcon,
    ViewList as ViewListIcon,
    ViewModule as ViewModuleIcon,
    Delete as DeleteIcon,
    Edit as EditIcon,
    Share as ShareIcon,
    Download as DownloadIcon,
    MoreVert as MoreVertIcon,
    Folder as FolderIcon,
    Description as DescriptionIcon,
    Security as SecurityIcon,
    CheckCircle as CheckCircleIcon,
    Warning as WarningIcon,
    Close as CloseIcon,
    Chat as ChatIcon,
    ContentCopy as ContentCopyIcon
} from '@mui/icons-material';
import DocumentTable from '../components/documents/DocumentTable';
import DocumentUpload from '../components/documents/DocumentUpload';
import CSVUpload from '../components/documents/CSVUpload';
import SensitivityBadge from '../components/documents/SensitivityBadge';
import AccessControlEditor from '../components/documents/AccessControlEditor';
import { documentService } from '../services/documentService';
import { auditService } from '../services/auditService';
import { useAuth } from '../hooks/useAuth';
import { formatDate, formatDateTime, formatFileSize } from '../utils/helpers';

const Documents = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { documentId } = useParams();
    const { user, hasPermission } = useAuth();

    const [activeTab, setActiveTab] = useState(0);
    const [viewMode, setViewMode] = useState('table');
    const [showUpload, setShowUpload] = useState(false);
    const [showCSVUpload, setShowCSVUpload] = useState(false);
    const [showAccessControl, setShowAccessControl] = useState(false);
    const [selectedDocument, setSelectedDocument] = useState(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deletingDocument, setDeletingDocument] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterAnchor, setFilterAnchor] = useState(null);
    const [stats, setStats] = useState(null);
    const [refreshKey, setRefreshKey] = useState(0);

    // Document Edit Modal state
    const [editingDocument, setEditingDocument] = useState(null);
    const [editForm, setEditForm] = useState({ title: '', department: '', classification: '', tags: '' });
    const [savingEdit, setSavingEdit] = useState(false);

    // Document Viewer Modal state
    const [viewingDocument, setViewingDocument] = useState(null);
    const [viewLoading, setViewLoading] = useState(false);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

    const fetchStats = useCallback(async () => {
        try {
            const result = await documentService.getDocumentStats();
            setStats(result);
        } catch (error) {
            console.error('Failed to fetch stats:', error);
        }
    }, []);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    // Direct URL navigation and tab sync
    useEffect(() => {
        if (documentId) {
            loadDocumentDetails(documentId);
        }
    }, [documentId]);

    useEffect(() => {
        const path = location.pathname;
        if (path.includes('/favorites')) {
            setActiveTab(1);
        } else if (path.includes('/archived')) {
            setActiveTab(4);
        } else if (path.includes('/shared')) {
            setActiveTab(3);
        } else if (path.includes('/upload')) {
            setShowUpload(true);
        }
    }, [location.pathname]);

    const loadDocumentDetails = async (docId, initialDoc = null) => {
        if (initialDoc) setViewingDocument(initialDoc);
        setViewLoading(true);
        try {
            const fullDoc = await documentService.getDocument(docId);
            setViewingDocument(fullDoc);
        } catch (err) {
            console.error('Failed to load document details:', err);
            if (!initialDoc) {
                navigate('/documents');
            }
        } finally {
            setViewLoading(false);
        }
    };

    const handleTabChange = (event, newValue) => {
        setActiveTab(newValue);
    };

    const handleViewModeChange = (mode) => {
        setViewMode(mode);
    };

    const handleDocumentClick = (document) => {
        const id = document.id || document._id;
        loadDocumentDetails(id, document);
    };

    const handleCloseViewDialog = () => {
        setViewingDocument(null);
        if (documentId) {
            navigate('/documents');
        }
    };

    const handleChatWithDocument = (document) => {
        const doc = document || viewingDocument;
        if (!doc) return;
        const convId = `conv-${Date.now()}`;
        navigate(`/chat/${convId}`, {
            state: {
                initialQuery: `What does the document "${doc.title}" say?`,
                documentTitle: doc.title,
                documentId: doc.id || doc._id
            }
        });
    };

    const handleCopyContent = () => {
        if (viewingDocument?.content) {
            navigator.clipboard.writeText(viewingDocument.content);
            setSnackbar({ open: true, message: 'Document content copied to clipboard!', severity: 'success' });
        }
    };

    const handleEditDocument = (document) => {
        setEditingDocument(document);
        setEditForm({
            title: document.title || '',
            department: document.department || 'General',
            classification: document.classification || 'internal',
            tags: Array.isArray(document.tags) ? document.tags.join(', ') : (document.tags || '')
        });
    };

    const handleSaveEdit = async () => {
        if (!editingDocument) return;
        setSavingEdit(true);
        try {
            const id = editingDocument.id || editingDocument._id;
            const updatedTags = editForm.tags
                ? editForm.tags.split(',').map(t => t.trim()).filter(Boolean)
                : [];
            
            await documentService.updateDocument(id, {
                title: editForm.title,
                department: editForm.department,
                classification: editForm.classification,
                tags: updatedTags
            });

            setSnackbar({ open: true, message: 'Document updated successfully!', severity: 'success' });
            setEditingDocument(null);
            setRefreshKey(prev => prev + 1);
            fetchStats();
        } catch (error) {
            console.error('Failed to update document:', error);
            setSnackbar({ open: true, message: 'Failed to update document', severity: 'error' });
        } finally {
            setSavingEdit(false);
        }
    };

    const handleShareDocument = (document) => {
        setSelectedDocument(document);
        setShowAccessControl(true);
    };

    const handleDeleteDocument = (document) => {
        setDeletingDocument(document);
        setDeleteDialogOpen(true);
    };

    const handleConfirmDelete = async () => {
        try {
            const id = deletingDocument.id || deletingDocument._id;
            await documentService.deleteDocument(id);

            await auditService.logEvent({
                action: 'DOCUMENT_DELETE',
                resourceType: 'document',
                resourceId: id,
                details: {
                    title: deletingDocument.title
                },
                status: 'success'
            });

            setDeleteDialogOpen(false);
            setDeletingDocument(null);
            setRefreshKey(prev => prev + 1);
            fetchStats();
        } catch (error) {
            console.error('Failed to delete document:', error);
        }
    };

    const handleDownloadDocument = async (document) => {
        try {
            const id = document.id || document._id;
            await documentService.downloadDocument(id);

            await auditService.logEvent({
                action: 'DOCUMENT_DOWNLOAD',
                resourceType: 'document',
                resourceId: id,
                details: {
                    title: document.title
                },
                status: 'success'
            });
        } catch (error) {
            console.error('Failed to download document:', error);
        }
    };

    const handleFilterOpen = (event) => {
        setFilterAnchor(event.currentTarget);
    };

    const handleFilterClose = () => {
        setFilterAnchor(null);
    };

    const handleUploadComplete = () => {
        setShowUpload(false);
        setShowCSVUpload(false);
        setRefreshKey(prev => prev + 1);
        fetchStats();
    };

    const tabs = [
        { label: 'All Documents', value: 0, key: 'all' },
        { label: 'Favorites', value: 1, key: 'favorites' },
        { label: 'My Documents', value: 2, key: 'my' },
        { label: 'Shared with Me', value: 3, key: 'shared' },
        { label: 'Archived', value: 4, key: 'archived' }
    ];

    return (
        <Box sx={{ p: 3 }}>
            {/* Header */}
            <Box sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 3,
                flexWrap: 'wrap',
                gap: 2
            }}>
                <Box>
                    <Typography variant="h5" gutterBottom sx={{ fontWeight: 700 }}>
                        Documents
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Manage your secure documents
                    </Typography>
                </Box>

                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => setShowUpload(true)}
                        sx={{ bgcolor: 'primary.main' }}
                    >
                        Upload Document
                    </Button>

                    <Button
                        variant="outlined"
                        startIcon={<UploadIcon />}
                        onClick={() => setShowCSVUpload(true)}
                    >
                        Bulk Upload CSV
                    </Button>
                </Box>
            </Box>

            {/* Stats Cards */}
            {stats && (
                <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid item xs={12} sm={6} md={3}>
                        <Card elevation={1}>
                            <CardContent>
                                <Typography variant="caption" color="text.secondary">
                                    Total Documents
                                </Typography>
                                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                                    {stats.totalDocuments || 0}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>

                    <Grid item xs={12} sm={6} md={3}>
                        <Card elevation={1}>
                            <CardContent>
                                <Typography variant="caption" color="text.secondary">
                                    Confidential
                                </Typography>
                                <Typography variant="h4" sx={{ fontWeight: 700, color: 'warning.main' }}>
                                    {stats.confidentialCount || 0}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>

                    <Grid item xs={12} sm={6} md={3}>
                        <Card elevation={1}>
                            <CardContent>
                                <Typography variant="caption" color="text.secondary">
                                    Restricted
                                </Typography>
                                <Typography variant="h4" sx={{ fontWeight: 700, color: 'error.main' }}>
                                    {stats.restrictedCount || 0}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>

                    <Grid item xs={12} sm={6} md={3}>
                        <Card elevation={1}>
                            <CardContent>
                                <Typography variant="caption" color="text.secondary">
                                    Total Size
                                </Typography>
                                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                                    {formatFileSize(stats.totalSize || 0)}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            )}

            {/* Tabs and View Controls */}
            <Box sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 2,
                flexWrap: 'wrap',
                gap: 1
            }}>
                <Tabs value={activeTab} onChange={handleTabChange}>
                    {tabs.map((tab) => (
                        <Tab key={tab.value} label={tab.label} />
                    ))}
                </Tabs>

                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Tooltip title="Filter">
                        <IconButton onClick={handleFilterOpen}>
                            <FilterListIcon />
                        </IconButton>
                    </Tooltip>

                    <Tooltip title="Table View">
                        <IconButton
                            onClick={() => handleViewModeChange('table')}
                            color={viewMode === 'table' ? 'primary' : 'default'}
                        >
                            <ViewListIcon />
                        </IconButton>
                    </Tooltip>

                    <Tooltip title="Grid View">
                        <IconButton
                            onClick={() => handleViewModeChange('grid')}
                            color={viewMode === 'grid' ? 'primary' : 'default'}
                        >
                            <ViewModuleIcon />
                        </IconButton>
                    </Tooltip>
                </Box>
            </Box>

            {/* Document Table */}
            {viewMode === 'table' ? (
                <DocumentTable
                    key={`${refreshKey}-${activeTab}`}
                    tab={tabs[activeTab]?.key || 'all'}
                    onDocumentClick={handleDocumentClick}
                    onChatDocument={handleChatWithDocument}
                    onEditDocument={handleEditDocument}
                    onShareDocument={handleShareDocument}
                    onDeleteDocument={handleDeleteDocument}
                    onDownloadDocument={handleDownloadDocument}
                    onToggleFavorite={() => {
                        fetchStats();
                    }}
                    onToggleArchive={() => {
                        fetchStats();
                        setRefreshKey(prev => prev + 1);
                    }}
                />
            ) : (
                <Typography variant="body2" color="text.secondary">
                    Grid view coming soon
                </Typography>
            )}

            {/* Document Viewer Modal */}
            <Dialog
                open={Boolean(viewingDocument)}
                onClose={handleCloseViewDialog}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle sx={{ m: 0, p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <DescriptionIcon color="primary" />
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                            {viewingDocument?.title || 'Document Details'}
                        </Typography>
                        {viewingDocument?.classification && (
                            <SensitivityBadge classification={viewingDocument.classification} />
                        )}
                    </Box>
                    <IconButton onClick={handleCloseViewDialog} size="small">
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>
                <Divider />
                <DialogContent sx={{ p: 3 }}>
                    {viewLoading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                            <CircularProgress />
                        </Box>
                    ) : (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {/* Metadata Overview */}
                            <Paper variant="outlined" sx={{ p: 2, bgcolor: 'background.default' }}>
                                <Grid container spacing={2}>
                                    <Grid item xs={6} sm={3}>
                                        <Typography variant="caption" color="text.secondary">Department</Typography>
                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                            {viewingDocument?.department || 'N/A'}
                                        </Typography>
                                    </Grid>
                                    <Grid item xs={6} sm={3}>
                                        <Typography variant="caption" color="text.secondary">Owner</Typography>
                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                            {viewingDocument?.owner?.username || viewingDocument?.owner?.fullName || 'admin'}
                                        </Typography>
                                    </Grid>
                                    <Grid item xs={6} sm={3}>
                                        <Typography variant="caption" color="text.secondary">File Size</Typography>
                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                            {formatFileSize(viewingDocument?.fileSize || viewingDocument?.content?.length || 0)}
                                        </Typography>
                                    </Grid>
                                    <Grid item xs={6} sm={3}>
                                        <Typography variant="caption" color="text.secondary">Created Date</Typography>
                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                            {viewingDocument?.createdAt ? formatDate(viewingDocument.createdAt) : 'Recent'}
                                        </Typography>
                                    </Grid>
                                </Grid>

                                {viewingDocument?.tags && viewingDocument.tags.length > 0 && (
                                    <Box sx={{ mt: 1.5, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                        {viewingDocument.tags.map((tag, i) => (
                                            <Chip key={i} label={tag} size="small" variant="outlined" />
                                        ))}
                                    </Box>
                                )}
                            </Paper>

                            {/* Document Content */}
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                    Decrypted Document Content
                                </Typography>
                                <Button
                                    size="small"
                                    startIcon={<ContentCopyIcon />}
                                    onClick={handleCopyContent}
                                >
                                    Copy Text
                                </Button>
                            </Box>

                            <Paper
                                variant="outlined"
                                sx={{
                                    p: 2,
                                    maxHeight: 350,
                                    overflowY: 'auto',
                                    whiteSpace: 'pre-wrap',
                                    fontFamily: 'monospace',
                                    fontSize: '0.875rem',
                                    bgcolor: 'background.paper',
                                    lineHeight: 1.6
                                }}
                            >
                                {(() => {
                                    const content = viewingDocument?.content;
                                    const highlight = location.state?.highlightText || location.state?.snippet;
                                    if (!content) {
                                        return (
                                            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                                No text content extracted for this document.
                                            </Typography>
                                        );
                                    }
                                    if (!highlight || highlight.length < 5) {
                                        return content;
                                    }
                                    // Highlight citation mention
                                    const cleanHighlight = highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                                    const regex = new RegExp(`(${cleanHighlight.slice(0, 80)})`, 'gi');
                                    const parts = content.split(regex);
                                    if (parts.length === 1) return content;
                                    return parts.map((part, i) =>
                                        regex.test(part) ? (
                                            <Box
                                                component="mark"
                                                key={i}
                                                sx={{
                                                    bgcolor: 'warning.light',
                                                    color: 'warning.contrastText',
                                                    px: 0.5,
                                                    py: 0.2,
                                                    borderRadius: 0.5,
                                                    fontWeight: 700
                                                }}
                                            >
                                                {part}
                                            </Box>
                                        ) : (
                                            part
                                        )
                                    );
                                })()}
                            </Paper>
                        </Box>
                    )}
                </DialogContent>
                <Divider />
                <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
                    <Button
                        variant="contained"
                        color="primary"
                        startIcon={<ChatIcon />}
                        onClick={() => handleChatWithDocument(viewingDocument)}
                    >
                        Chat with this Document
                    </Button>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                            variant="outlined"
                            startIcon={<DownloadIcon />}
                            onClick={() => handleDownloadDocument(viewingDocument)}
                        >
                            Download
                        </Button>
                        <Button onClick={handleCloseViewDialog}>
                            Close
                        </Button>
                    </Box>
                </DialogActions>
            </Dialog>

            {/* Single Document Upload Dialog */}
            <Dialog
                open={showUpload}
                onClose={() => setShowUpload(false)}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>
                    Upload Document
                    <IconButton
                        onClick={() => setShowUpload(false)}
                        sx={{ position: 'absolute', right: 8, top: 8 }}
                    >
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>
                <DialogContent>
                    <DocumentUpload
                        onUploadComplete={handleUploadComplete}
                        onCancel={() => setShowUpload(false)}
                    />
                </DialogContent>
            </Dialog>

            {/* CSV Bulk Upload Dialog */}
            <Dialog
                open={showCSVUpload}
                onClose={() => setShowCSVUpload(false)}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>
                    Bulk Upload from CSV
                    <IconButton
                        onClick={() => setShowCSVUpload(false)}
                        sx={{ position: 'absolute', right: 8, top: 8 }}
                    >
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>
                <DialogContent>
                    <CSVUpload
                        onUploadComplete={handleUploadComplete}
                        onCancel={() => setShowCSVUpload(false)}
                    />
                </DialogContent>
            </Dialog>

            {/* Access Control Dialog */}
            <Dialog
                open={showAccessControl}
                onClose={() => setShowAccessControl(false)}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>
                    Access Control
                    <IconButton
                        onClick={() => setShowAccessControl(false)}
                        sx={{ position: 'absolute', right: 8, top: 8 }}
                    >
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>
                <DialogContent>
                    {selectedDocument && (
                        <AccessControlEditor
                            document={selectedDocument}
                            onSave={() => setShowAccessControl(false)}
                            onClose={() => setShowAccessControl(false)}
                        />
                    )}
                </DialogContent>
            </Dialog>

            {/* Edit Document Dialog */}
            <Dialog
                open={Boolean(editingDocument)}
                onClose={() => setEditingDocument(null)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle sx={{ m: 0, p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <EditIcon color="primary" />
                        <Typography variant="h6">Edit Document Details</Typography>
                    </Box>
                    <IconButton onClick={() => setEditingDocument(null)} size="small">
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>
                <Divider />
                <DialogContent sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                    <TextField
                        label="Document Title"
                        fullWidth
                        value={editForm.title}
                        onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                        size="small"
                    />

                    <FormControl fullWidth size="small">
                        <InputLabel>Classification</InputLabel>
                        <Select
                            value={editForm.classification}
                            label="Classification"
                            onChange={(e) => setEditForm(prev => ({ ...prev, classification: e.target.value }))}
                        >
                            <MenuItem value="public">Public</MenuItem>
                            <MenuItem value="internal">Internal</MenuItem>
                            <MenuItem value="confidential">Confidential</MenuItem>
                            <MenuItem value="restricted">Restricted</MenuItem>
                        </Select>
                    </FormControl>

                    <FormControl fullWidth size="small">
                        <InputLabel>Department</InputLabel>
                        <Select
                            value={editForm.department}
                            label="Department"
                            onChange={(e) => setEditForm(prev => ({ ...prev, department: e.target.value }))}
                        >
                            <MenuItem value="Security & Compliance">Security & Compliance</MenuItem>
                            <MenuItem value="Engineering">Engineering</MenuItem>
                            <MenuItem value="Operations">Operations</MenuItem>
                            <MenuItem value="Finance">Finance</MenuItem>
                            <MenuItem value="Legal">Legal</MenuItem>
                            <MenuItem value="General">General</MenuItem>
                        </Select>
                    </FormControl>

                    <TextField
                        label="Tags (comma separated)"
                        fullWidth
                        value={editForm.tags}
                        onChange={(e) => setEditForm(prev => ({ ...prev, tags: e.target.value }))}
                        placeholder="policy, security, manual"
                        size="small"
                    />
                </DialogContent>
                <Divider />
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setEditingDocument(null)} disabled={savingEdit}>
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={handleSaveEdit}
                        disabled={savingEdit || !editForm.title.trim()}
                        startIcon={savingEdit ? <CircularProgress size={16} /> : <CheckCircleIcon />}
                    >
                        {savingEdit ? 'Saving...' : 'Save Changes'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog
                open={deleteDialogOpen}
                onClose={() => setDeleteDialogOpen(false)}
            >
                <DialogTitle>Delete Document</DialogTitle>
                <DialogContent>
                    <Typography variant="body1">
                        Are you sure you want to delete "{deletingDocument?.title}"?
                        This action cannot be undone.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
                    <Button
                        variant="contained"
                        color="error"
                        onClick={handleConfirmDelete}
                        startIcon={<DeleteIcon />}
                    >
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Filter Menu */}
            <Menu
                anchorEl={filterAnchor}
                open={Boolean(filterAnchor)}
                onClose={handleFilterClose}
            >
                <MenuItem>
                    <ListItemIcon>
                        <SecurityIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Filter by Classification</ListItemText>
                </MenuItem>
                <MenuItem>
                    <ListItemIcon>
                        <FolderIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Filter by Department</ListItemText>
                </MenuItem>
                <MenuItem>
                    <ListItemIcon>
                        <SortIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Sort Options</ListItemText>
                </MenuItem>
            </Menu>

            {/* Snackbar */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default Documents;
