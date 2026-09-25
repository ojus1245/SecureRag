import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
    Badge
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
    Close as CloseIcon
} from '@mui/icons-material';
import DocumentTable from '../components/documents/DocumentTable';
import DocumentUpload from '../components/documents/DocumentUpload';
import CSVUpload from '../components/documents/CSVUpload';
import SensitivityBadge from '../components/documents/SensitivityBadge';
import AccessControlEditor from '../components/documents/AccessControlEditor';
import { documentService } from '../services/documentService';
import { auditService } from '../services/auditService';
import { useAuth } from '../hooks/useAuth';

const Documents = () => {
    const navigate = useNavigate();
    const location = useLocation();
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

    const handleTabChange = (event, newValue) => {
        setActiveTab(newValue);
    };

    const handleViewModeChange = (mode) => {
        setViewMode(mode);
    };

    const handleDocumentClick = (document) => {
        navigate(`/documents/${document.id}`);
    };

    const handleEditDocument = (document) => {
        navigate(`/documents/${document.id}/edit`);
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
            await documentService.deleteDocument(deletingDocument.id);

            await auditService.logEvent({
                action: 'DOCUMENT_DELETE',
                resourceType: 'document',
                resourceId: deletingDocument.id,
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
            await documentService.downloadDocument(document.id);

            await auditService.logEvent({
                action: 'DOCUMENT_DOWNLOAD',
                resourceType: 'document',
                resourceId: document.id,
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
        { label: 'All Documents', value: 0 },
        { label: 'My Documents', value: 1 },
        { label: 'Shared with Me', value: 2 },
        { label: 'Recent', value: 3 },
        { label: 'Archived', value: 4 }
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
                    <Typography variant="h5" gutterBottom>
                        Documents
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Manage your secure documents
                    </Typography>
                </Box>

                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {hasPermission('document:create') && (
                        <>
                            <Button
                                variant="contained"
                                startIcon={<AddIcon />}
                                onClick={() => setShowUpload(true)}
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
                        </>
                    )}
                </Box>
            </Box>

            {/* Stats Cards */}
            {stats && (
                <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid item xs={12} sm={6} md={3}>
                        <Card>
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
                        <Card>
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
                        <Card>
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
                        <Card>
                            <CardContent>
                                <Typography variant="caption" color="text.secondary">
                                    Total Size
                                </Typography>
                                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                                    {((stats.totalSize || 0) / 1024 / 1024).toFixed(2)} MB
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
                    key={refreshKey}
                    onDocumentClick={handleDocumentClick}
                    onEditDocument={handleEditDocument}
                    onShareDocument={handleShareDocument}
                    onDeleteDocument={handleDeleteDocument}
                    onDownloadDocument={handleDownloadDocument}
                />
            ) : (
                <Typography variant="body2" color="text.secondary">
                    Grid view coming soon
                </Typography>
            )}

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
        </Box>
    );
};

export default Documents;