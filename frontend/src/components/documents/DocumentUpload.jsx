import React, { useState, useRef, useCallback } from 'react';
import {
    Box, Paper, Typography, Button, TextField, Select, MenuItem,
    FormControl, InputLabel, Chip, IconButton, Tooltip, LinearProgress,
    Alert, Stepper, Step, StepLabel, CircularProgress, FormControlLabel,
    Radio, RadioGroup, Checkbox, Grid
} from '@mui/material';
import {
    CloudUpload as UploadIcon, Close as CloseIcon, Check as CheckIcon,
    Description as DescriptionIcon, Lock as LockIcon, Public as PublicIcon,
    LockOutlined as LockOutlinedIcon, LockOpen as LockOpenIcon,
    Info as InfoIcon, Warning as WarningIcon, CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import { documentService } from '../../services/documentService';
import { auditService } from '../../services/auditService';
import { useAuth } from '../../hooks/useAuth';
import { FILE_TYPES, MAX_FILE_SIZE, ALLOWED_MIME_TYPES } from '../../constants/documents';

const CLASSIFICATION_OPTIONS = [
    { value: 'public', label: 'Public', description: 'Available to everyone' },
    { value: 'internal', label: 'Internal', description: 'Available within organization' },
    { value: 'confidential', label: 'Confidential', description: 'Restricted access' },
    { value: 'restricted', label: 'Restricted', description: 'Highest security level' }
];

const DocumentUpload = ({ onUploadComplete, onCancel }) => {
    const { user } = useAuth();
    const [activeStep, setActiveStep] = useState(0);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [safetyCheck, setSafetyCheck] = useState(null);

    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [department, setDepartment] = useState(user?.department || '');
    const [classification, setClassification] = useState('internal');
    const [tags, setTags] = useState([]);
    const [tagInput, setTagInput] = useState('');
    const [fileType, setFileType] = useState('txt');
    const [metadata, setMetadata] = useState({});
    const [files, setFiles] = useState([]);
    const [encryptContent, setEncryptContent] = useState(true);
    const [encryptEmbedding, setEncryptEmbedding] = useState(true);

    const fileInputRef = useRef(null);

    const onDrop = useCallback(async (acceptedFiles, rejectedFiles) => {
        if (rejectedFiles.length > 0) {
            const errors = rejectedFiles.map(f => ({
                file: f.file.name,
                errors: f.errors.map(e => e.message)
            }));
            setError(`Some files were rejected: ${JSON.stringify(errors)}`);
            return;
        }

        setFiles(acceptedFiles);

        if (acceptedFiles.length > 0) {
            const file = acceptedFiles[0];

            if (!title) {
                const fileName = file.name.replace(/\.[^/.]+$/, '');
                setTitle(fileName.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()));
            }

            const extension = file.name.split('.').pop().toLowerCase();
            if (FILE_TYPES.includes(extension)) {
                setFileType(extension);
            }

            if (
                file.type.startsWith('text/') ||
                extension === 'txt' || extension === 'md' ||
                extension === 'csv' || extension === 'json' || extension === 'html'
            ) {
                try {
                    const fileContent = await file.text();
                    setContent(fileContent);
                } catch (err) {
                    console.error('Failed to read file:', err);
                }
            }
        }
    }, [title]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: ALLOWED_MIME_TYPES,
        maxSize: MAX_FILE_SIZE,
        multiple: false
    });

    const steps = ['Upload File', 'Document Details', 'Security Settings', 'Review'];

    const handleNext = () => setActiveStep(prev => prev + 1);
    const handleBack = () => setActiveStep(prev => prev - 1);

    const handleAddTag = () => {
        const trimmed = tagInput.trim().toLowerCase();
        if (trimmed && !tags.includes(trimmed)) {
            setTags([...tags, trimmed]);
            setTagInput('');
        }
    };

    const handleRemoveTag = (tagToRemove) => {
        setTags(tags.filter(tag => tag !== tagToRemove));
    };

    const handleTagKeyPress = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddTag();
        }
    };

    const validateStep = (step) => {
        switch (step) {
            case 0: return files.length > 0 || content.trim().length > 0;
            case 1: return title.trim().length >= 3 && department.trim().length > 0;
            case 2: return classification && classification.length > 0;
            case 3: return true;
            default: return false;
        }
    };

    const handleUpload = async () => {
        setUploading(true);
        setUploadProgress(0);
        setError(null);
        setSuccess(null);

        try {
            let finalContent = content;

            if (!finalContent && files.length > 0) {
                const file = files[0];
                const ext = file.name.split('.').pop().toLowerCase();

                if (
                    file.type.startsWith('text/') ||
                    ext === 'txt' || ext === 'md' ||
                    ext === 'csv' || ext === 'json' || ext === 'html'
                ) {
                    finalContent = await file.text();
                } else {
                    finalContent = `Content from file: ${file.name}`;
                }

                setContent(finalContent);
            }

            if (!finalContent || finalContent.trim().length === 0) {
                finalContent = title || 'Untitled document';
            }

            const finalDepartment = department || user?.department || 'General';

            const uploadData = {
                title: (title || '').trim() || 'Untitled Document',
                content: finalContent.trim(),
                department: finalDepartment,
                classification: classification || 'internal',
                tags: Array.isArray(tags) ? tags : [],
                fileType: fileType || 'txt',
                metadata: {
                    ...metadata,
                    encryptContent,
                    encryptEmbedding,
                    uploadedBy: user?.id
                }
            };

            console.log('=== UPLOAD DATA ===');
            console.log('Title:', uploadData.title, '| Length:', uploadData.title.length);
            console.log('Content length:', uploadData.content.length);
            console.log('Department:', uploadData.department);
            console.log('Classification:', uploadData.classification);
            console.log('Tags:', uploadData.tags);
            console.log('FileType:', uploadData.fileType);

            // ============================================
            // SAFETY CHECK — TEMPORARILY DISABLED FOR DEBUGGING
            // Re-enable before shipping to production.
            // ============================================
            // if (uploadData.content && uploadData.content.length > 10) {
            //     try {
            //         const safetyResult = await documentService.checkSafety(uploadData.content);
            //         setSafetyCheck(safetyResult);
            //         if (!safetyResult.safe) {
            //             setError(`Content failed safety check: ${safetyResult.reason}`);
            //             setUploading(false);
            //             return;
            //         }
            //     } catch (safetyError) {
            //         console.warn('Safety check failed, continuing:', safetyError);
            //     }
            // }

            const result = await documentService.uploadDocument(uploadData, {
                file: files[0] || null,
                onProgress: (progress) => setUploadProgress(progress)
            });

            console.log('=== UPLOAD SUCCESS ===', result);
            setSuccess('Document uploaded successfully');

            try {
                await auditService.logEvent({
                    action: 'DOCUMENT_CREATE',
                    resourceType: 'document',
                    resourceId: result.id,
                    details: {
                        title: uploadData.title,
                        classification: uploadData.classification,
                        department: uploadData.department
                    },
                    status: 'success'
                });
            } catch (auditError) {
                console.warn('Audit log failed:', auditError);
            }

            if (onUploadComplete) {
                setTimeout(() => onUploadComplete(result), 1500);
            }

        } catch (error) {
            console.error('=== UPLOAD ERROR ===');
            console.error('Message:', error.message);
            console.error('Response:', error.response?.data);

            const errorData = error.response?.data;
            if (errorData?.errors && Array.isArray(errorData.errors)) {
                const errorMessages = errorData.errors
                    .map(e => `${e.field || e.param}: ${e.message || e.msg}`)
                    .join(', ');
                setError(`Validation failed: ${errorMessages}`);
            } else {
                setError(error.message || 'Failed to upload document');
            }
        } finally {
            setUploading(false);
        }
    };

    const handleRemoveFile = () => {
        setFiles([]);
        setContent('');
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const getClassificationIcon = (level) => {
        switch (level) {
            case 'public': return <PublicIcon />;
            case 'internal': return <LockOpenIcon />;
            case 'confidential': return <LockIcon />;
            case 'restricted': return <LockOutlinedIcon />;
            default: return <InfoIcon />;
        }
    };

    const getClassificationColor = (level) => {
        switch (level) {
            case 'public': return 'success';
            case 'internal': return 'info';
            case 'confidential': return 'warning';
            case 'restricted': return 'error';
            default: return 'default';
        }
    };

    return (
        <Paper elevation={3} sx={{ p: 3, maxWidth: 800, margin: '0 auto' }}>
            <Box sx={{ mb: 3 }}>
                <Typography variant="h5" gutterBottom>Upload Document</Typography>
                <Typography variant="body2" color="text.secondary">
                    Upload documents to the secure knowledge base with encryption and access control
                </Typography>
            </Box>

            <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
                {steps.map((label) => (
                    <Step key={label}><StepLabel>{label}</StepLabel></Step>
                ))}
            </Stepper>

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

            {safetyCheck && safetyCheck.safe && (
                <Alert severity="success" sx={{ mb: 2 }} icon={<CheckCircleIcon />}>
                    Safety Check: {safetyCheck.reason || 'Passed'}
                    {safetyCheck.score && ` (Score: ${(safetyCheck.score * 100).toFixed(1)}%)`}
                </Alert>
            )}

            {activeStep === 0 && (
                <Box>
                    <Box
                        {...getRootProps()}
                        sx={{
                            border: '2px dashed',
                            borderColor: isDragActive ? 'primary.main' : 'grey.300',
                            borderRadius: 2, p: 4, textAlign: 'center', cursor: 'pointer',
                            bgcolor: isDragActive ? 'action.hover' : 'background.default',
                            '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' },
                            mb: 2
                        }}
                    >
                        <input {...getInputProps()} />
                        <UploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                        <Typography variant="h6" gutterBottom>
                            {isDragActive ? 'Drop file here' : 'Drag & drop file here'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            or click to select file
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                            Supported: PDF, DOCX, TXT, MD, HTML, JSON (Max: 10MB)
                        </Typography>
                    </Box>

                    {files.length > 0 && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
                            <DescriptionIcon color="primary" />
                            <Box sx={{ flex: 1 }}>
                                <Typography variant="body2">{files[0].name}</Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {(files[0].size / 1024).toFixed(2)} KB
                                </Typography>
                            </Box>
                            <Tooltip title="Remove file">
                                <IconButton size="small" onClick={handleRemoveFile}>
                                    <CloseIcon />
                                </IconButton>
                            </Tooltip>
                        </Box>
                    )}

                    <Box sx={{ mt: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>Or paste content directly:</Typography>
                        <TextField
                            fullWidth multiline rows={6} value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="Paste document content here..."
                            variant="outlined" size="small"
                        />
                    </Box>
                </Box>
            )}

            {activeStep === 1 && (
                <Box>
                    <Grid container spacing={2}>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth label="Document Title" value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                required variant="outlined" size="small"
                                error={title.length > 0 && title.length < 3}
                                helperText={title.length > 0 && title.length < 3 ? 'Title must be at least 3 characters' : ''}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth label="Department" value={department}
                                onChange={(e) => setDepartment(e.target.value)}
                                required variant="outlined" size="small"
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <FormControl fullWidth size="small">
                                <InputLabel>File Type</InputLabel>
                                <Select value={fileType} onChange={(e) => setFileType(e.target.value)} label="File Type">
                                    {FILE_TYPES.map(type => (
                                        <MenuItem key={type} value={type}>{type.toUpperCase()}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12}>
                            <Typography variant="subtitle2" gutterBottom>Tags</Typography>
                            <Box sx={{
                                display: 'flex', flexWrap: 'wrap', gap: 0.5, p: 1,
                                border: '1px solid', borderColor: 'grey.300', borderRadius: 1, minHeight: 48
                            }}>
                                {tags.map((tag) => (
                                    <Chip key={tag} label={tag} onDelete={() => handleRemoveTag(tag)} size="small" />
                                ))}
                                <input
                                    value={tagInput}
                                    onChange={(e) => setTagInput(e.target.value)}
                                    onKeyPress={handleTagKeyPress}
                                    onBlur={handleAddTag}
                                    placeholder="Type tag and press Enter"
                                    style={{ border: 'none', outline: 'none', flex: 1, minWidth: 150, fontSize: '0.875rem' }}
                                />
                            </Box>
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth label="Additional Metadata (JSON)" multiline rows={3}
                                placeholder='{"author": "John Doe", "year": 2024}'
                                onChange={(e) => {
                                    try {
                                        const parsed = e.target.value ? JSON.parse(e.target.value) : {};
                                        setMetadata(parsed);
                                    } catch (error) { /* Invalid JSON */ }
                                }}
                                variant="outlined" size="small"
                            />
                        </Grid>
                    </Grid>
                </Box>
            )}

            {activeStep === 2 && (
                <Box>
                    <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
                        Classification Level
                    </Typography>

                    <RadioGroup value={classification} onChange={(e) => setClassification(e.target.value)} sx={{ mb: 3 }}>
                        {CLASSIFICATION_OPTIONS.map((option) => {
                            const isSelected = classification === option.value;
                            return (
                                <FormControlLabel
                                    key={option.value} value={option.value}
                                    control={<Radio />}
                                    label={
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                            {getClassificationIcon(option.value)}
                                            <Box>
                                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                    {option.label}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {option.description}
                                                </Typography>
                                            </Box>
                                        </Box>
                                    }
                                    sx={{
                                        border: '2px solid',
                                        borderColor: isSelected ? 'primary.main' : 'grey.300',
                                        borderRadius: 1, p: 1.5, mb: 1.5, width: '100%',
                                        bgcolor: isSelected ? 'action.hover' : 'transparent',
                                        transition: 'all 0.2s'
                                    }}
                                />
                            );
                        })}
                    </RadioGroup>

                    <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                        Encryption Options
                    </Typography>

                    <FormControlLabel
                        control={<Checkbox checked={encryptContent} onChange={(e) => setEncryptContent(e.target.checked)} />}
                        label="Encrypt document content" sx={{ display: 'block' }}
                    />
                    <FormControlLabel
                        control={<Checkbox checked={encryptEmbedding} onChange={(e) => setEncryptEmbedding(e.target.checked)} />}
                        label="Encrypt document embeddings" sx={{ display: 'block' }}
                    />

                    <Alert severity="info" sx={{ mt: 2 }}>
                        <Typography variant="body2">
                            Documents will be encrypted using AES-256-GCM before storage.
                            Only users with appropriate clearance levels can access this document.
                        </Typography>
                    </Alert>
                </Box>
            )}

            {activeStep === 3 && (
                <Box>
                    <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                        Review Document Details
                    </Typography>

                    <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                        <Grid container spacing={2}>
                            <Grid item xs={4}>
                                <Typography variant="caption" color="text.secondary">Title</Typography>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>{title || 'N/A'}</Typography>
                            </Grid>
                            <Grid item xs={4}>
                                <Typography variant="caption" color="text.secondary">Department</Typography>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>{department || 'N/A'}</Typography>
                            </Grid>
                            <Grid item xs={4}>
                                <Typography variant="caption" color="text.secondary">File Type</Typography>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>{fileType.toUpperCase()}</Typography>
                            </Grid>
                            <Grid item xs={4}>
                                <Typography variant="caption" color="text.secondary">Classification</Typography>
                                <Chip
                                    icon={getClassificationIcon(classification)}
                                    label={classification.toUpperCase()}
                                    size="small" color={getClassificationColor(classification)} variant="outlined"
                                />
                            </Grid>
                            <Grid item xs={4}>
                                <Typography variant="caption" color="text.secondary">Tags</Typography>
                                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                    {tags.length > 0 ? tags.map(tag => (
                                        <Chip key={tag} label={tag} size="small" />
                                    )) : 'N/A'}
                                </Box>
                            </Grid>
                            <Grid item xs={4}>
                                <Typography variant="caption" color="text.secondary">Encryption</Typography>
                                <Typography variant="body2">
                                    Content: {encryptContent ? 'Yes' : 'No'} | Embedding: {encryptEmbedding ? 'Yes' : 'No'}
                                </Typography>
                            </Grid>
                            <Grid item xs={12}>
                                <Typography variant="caption" color="text.secondary">File</Typography>
                                <Typography variant="body2">
                                    {files.length > 0 ? files[0].name : 'Content pasted'}
                                    {files.length > 0 && ` (${(files[0].size / 1024).toFixed(2)} KB)`}
                                </Typography>
                            </Grid>
                            <Grid item xs={12}>
                                <Typography variant="caption" color="text.secondary">Content Length</Typography>
                                <Typography variant="body2">{content.length} characters</Typography>
                            </Grid>
                        </Grid>
                    </Paper>

                    <Alert severity="warning" sx={{ mb: 2 }}>
                        <Typography variant="body2">
                            By uploading this document, you confirm that you have the necessary permissions
                            to share this information and that it complies with organizational policies.
                        </Typography>
                    </Alert>
                </Box>
            )}

            {uploading && (
                <Box sx={{ mt: 2 }}>
                    <LinearProgress variant="determinate" value={uploadProgress} />
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                        Uploading... {uploadProgress}%
                    </Typography>
                </Box>
            )}

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
                <Button onClick={activeStep === 0 ? onCancel : handleBack} disabled={uploading}>
                    {activeStep === 0 ? 'Cancel' : 'Back'}
                </Button>

                <Box sx={{ display: 'flex', gap: 1 }}>
                    {activeStep < steps.length - 1 ? (
                        <Button variant="contained" onClick={handleNext} disabled={!validateStep(activeStep)}>
                            Next
                        </Button>
                    ) : (
                        <Button
                            variant="contained" onClick={handleUpload}
                            disabled={uploading || !title || !content}
                            startIcon={uploading ? <CircularProgress size={16} /> : <UploadIcon />}
                        >
                            {uploading ? 'Uploading...' : 'Upload Document'}
                        </Button>
                    )}
                </Box>
            </Box>
        </Paper>
    );
};

export default DocumentUpload;