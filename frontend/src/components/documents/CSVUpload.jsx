import React, { useState, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Divider,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Analytics as AnalyticsIcon,
  ExpandMore as ExpandMoreIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  Description as FileIcon
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import { documentService } from '../../services/documentService';
import { logger } from '../../utils/logger';

const CSVUpload = ({ onUploadComplete, onCancel }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [file, setFile] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [analysis, setAnalysis] = useState(null);
  const [uploadResult, setUploadResult] = useState(null);
  const [error, setError] = useState(null);

  const steps = ['Select CSV File', 'AI Analysis', 'Upload & Process'];

  // ============================================
  // Dropzone configuration
  // ============================================
  const onDrop = useCallback(async (acceptedFiles, rejectedFiles) => {
    if (rejectedFiles.length > 0) {
      const reasons = rejectedFiles[0].errors.map(e => e.message).join(', ');
      setError(`File rejected: ${reasons}`);
      return;
    }

    const selectedFile = acceptedFiles[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setError(null);
    setActiveStep(1);

    await analyzeFile(selectedFile);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.csv'],
      'text/plain': ['.csv']
    },
    maxSize: 5 * 1024 * 1024,
    multiple: false,
    disabled: analyzing || uploading
  });

  // ============================================
  // Analyze file
  // ============================================
  const analyzeFile = async (csvFile) => {
    setAnalyzing(true);
    setError(null);

    try {
      logger.info('Analyzing CSV file:', csvFile.name);
      const result = await documentService.analyzeCSV(csvFile);
      setAnalysis(result);
      logger.info('Analysis complete');
    } catch (err) {
      logger.error('Analysis failed:', err);
      setError(err.message || 'Analysis failed');
    } finally {
      setAnalyzing(false);
    }
  };

  // ============================================
  // Upload file
  // ============================================
  const handleUpload = async () => {
    setUploading(true);
    setError(null);
    setUploadProgress(0);
    setActiveStep(2);

    try {
      logger.info('Uploading CSV file:', file.name);
      const result = await documentService.bulkUploadCSV(file, (progress) => {
        setUploadProgress(progress);
      });
      setUploadResult(result);
      logger.info('Upload complete:', result);

      if (onUploadComplete) {
        onUploadComplete(result);
      }
    } catch (err) {
      logger.error('Upload failed:', err);
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  // ============================================
  // Reset form
  // ============================================
  const handleReset = () => {
    setFile(null);
    setAnalysis(null);
    setUploadResult(null);
    setError(null);
    setUploadProgress(0);
    setActiveStep(0);
  };

  // ============================================
  // Download sample CSV
  // ============================================
  const handleDownloadSample = () => {
    const sampleCSV = `title,content,department,classification,tags
"Sample Document 1","This is the content of the first sample document.","IT","internal","sample,test"
"Sample Document 2","This is the content of the second sample document.","HR","internal","sample,hr"
"Sample Document 3","This is the content of the third sample document.","Finance","confidential","sample,finance"`;

    const blob = new Blob([sampleCSV], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'sample-documents.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  // ============================================
  // Render
  // ============================================
  return (
    <Paper elevation={0} sx={{ p: 0 }}>
      <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
        Bulk Upload from CSV
      </Typography>

      <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* STEP 0: File Selection */}
      {activeStep === 0 && (
        <Box>
          <Paper
            {...getRootProps()}
            variant="outlined"
            sx={{
              p: 4,
              textAlign: 'center',
              border: '2px dashed',
              borderColor: isDragActive ? 'primary.main' : 'grey.300',
              bgcolor: isDragActive ? 'action.hover' : 'background.default',
              cursor: 'pointer',
              transition: 'all 0.2s',
              '&:hover': {
                borderColor: 'primary.main',
                bgcolor: 'action.hover'
              }
            }}
          >
            <input {...getInputProps()} />
            <UploadIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              {isDragActive ? 'Drop CSV file here' : 'Drag & drop CSV file here'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              or click to browse
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              Maximum file size: 5MB
            </Typography>
          </Paper>

          <Alert severity="info" sx={{ mt: 3 }}>
            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
              Required CSV Columns:
            </Typography>
            <Box component="ul" sx={{ mt: 1, mb: 1, pl: 2 }}>
              <li>
                <Typography variant="body2">
                  <strong>title</strong> (required) — Document title
                </Typography>
              </li>
              <li>
                <Typography variant="body2">
                  <strong>content</strong> (required) — Document content
                </Typography>
              </li>
              <li>
                <Typography variant="body2">
                  <strong>department</strong> (optional) — Department name
                </Typography>
              </li>
              <li>
                <Typography variant="body2">
                  <strong>classification</strong> (optional) — public | internal | confidential | restricted
                </Typography>
              </li>
              <li>
                <Typography variant="body2">
                  <strong>tags</strong> (optional) — Comma-separated tags
                </Typography>
              </li>
            </Box>
          </Alert>

          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={handleDownloadSample}
            >
              Download Sample CSV
            </Button>
          </Box>
        </Box>
      )}

      {/* STEP 1: Analysis */}
      {activeStep === 1 && (
        <Box>
          {analyzing ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <CircularProgress size={60} />
              <Typography variant="h6" sx={{ mt: 2 }}>
                AI Analyzing CSV File...
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Checking structure, safety, and content quality
              </Typography>
            </Box>
          ) : analysis ? (
            <Box>
              <Alert severity="success" icon={<CheckIcon />} sx={{ mb: 3 }}>
                ✅ CSV analyzed successfully — {analysis.totalRows} rows found
              </Alert>

              <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <FileIcon color="primary" />
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {file?.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {(file?.size / 1024).toFixed(2)} KB
                    </Typography>
                  </Box>
                  <Chip label={`${analysis.totalRows} rows`} color="primary" size="small" />
                </Box>
              </Paper>

              <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                  <AnalyticsIcon sx={{ mr: 1, verticalAlign: 'middle', fontSize: 20 }} />
                  Summary
                </Typography>
                <Divider sx={{ my: 1.5 }} />
                <Box sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                  gap: 2
                }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Total Rows
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 700 }}>
                      {analysis.totalRows}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Columns
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 700 }}>
                      {analysis.columns.length}
                    </Typography>
                  </Box>
                </Box>
              </Paper>

              {analysis.suggestions && analysis.suggestions.length > 0 && (
                <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                    AI Suggestions
                  </Typography>
                  <Divider sx={{ my: 1.5 }} />
                  <List dense>
                    {analysis.suggestions.map((suggestion, idx) => (
                      <ListItem key={idx} sx={{ px: 0 }}>
                        <ListItemIcon sx={{ minWidth: 32 }}>
                          {suggestion.startsWith('❌') ? <ErrorIcon color="error" fontSize="small" /> :
                           suggestion.startsWith('⚠️') ? <WarningIcon color="warning" fontSize="small" /> :
                           <InfoIcon color="info" fontSize="small" />}
                        </ListItemIcon>
                        <ListItemText
                          primary={suggestion}
                          primaryTypographyProps={{ variant: 'body2' }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Paper>
              )}

              <Accordion defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    Preview (first {analysis.preview.length} rows)
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <TableContainer sx={{ maxHeight: 300 }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          {analysis.columns.slice(0, 5).map(col => (
                            <TableCell key={col} sx={{ fontWeight: 600 }}>
                              {col}
                            </TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {analysis.preview.map((row, idx) => (
                          <TableRow key={idx} hover>
                            {analysis.columns.slice(0, 5).map(col => {
                              const val = String(row[col] || '');
                              return (
                                <TableCell key={col}>
                                  {val.length > 60 ? val.substring(0, 60) + '...' : val}
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </AccordionDetails>
              </Accordion>

              <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', mt: 3 }}>
                <Button onClick={handleReset} startIcon={<RefreshIcon />}>
                  Select Different File
                </Button>
                <Button
                  variant="contained"
                  onClick={handleUpload}
                  disabled={!analysis.requiredColumns?.title || !analysis.requiredColumns?.content}
                  startIcon={<UploadIcon />}
                  size="large"
                >
                  Upload {analysis.totalRows} Document{analysis.totalRows !== 1 ? 's' : ''}
                </Button>
              </Box>
            </Box>
          ) : null}
        </Box>
      )}

      {/* STEP 2: Upload Result */}
      {activeStep === 2 && (
        <Box>
          {uploading ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <CircularProgress size={60} />
              <Typography variant="h6" sx={{ mt: 2 }}>
                Uploading and Processing...
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Each document is being encrypted, embedded, and indexed
              </Typography>
              {uploadProgress > 0 && (
                <Box sx={{ mt: 3, mx: 'auto', maxWidth: 400 }}>
                  <LinearProgress
                    variant="determinate"
                    value={uploadProgress}
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    {uploadProgress}%
                  </Typography>
                </Box>
              )}
            </Box>
          ) : uploadResult ? (
            <Box>
              <Alert
                severity={uploadResult.failed === 0 ? 'success' : 'warning'}
                icon={uploadResult.failed === 0 ? <CheckIcon /> : <WarningIcon />}
                sx={{ mb: 3 }}
              >
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  {uploadResult.message}
                </Typography>
              </Alert>

              <Paper variant="outlined" sx={{ p: 3, mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                  Upload Results
                </Typography>
                <Divider sx={{ my: 2 }} />
                <Box sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                  gap: 2
                }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Total</Typography>
                    <Typography variant="h5" sx={{ fontWeight: 700 }}>
                      {uploadResult.total}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Uploaded</Typography>
                    <Typography variant="h5" sx={{ fontWeight: 700, color: 'success.main' }}>
                      {uploadResult.uploaded}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Failed</Typography>
                    <Typography
                      variant="h5"
                      sx={{
                        fontWeight: 700,
                        color: uploadResult.failed > 0 ? 'error.main' : 'text.secondary'
                      }}
                    >
                      {uploadResult.failed}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Success Rate</Typography>
                    <Typography variant="h5" sx={{ fontWeight: 700 }}>
                      {uploadResult.analysis?.successRate}
                    </Typography>
                  </Box>
                </Box>
              </Paper>

              {uploadResult.uploadedDocuments?.length > 0 && (
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      ✅ Uploaded Documents ({uploadResult.uploadedDocuments.length})
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <List dense>
                      {uploadResult.uploadedDocuments.map((doc, idx) => (
                        <ListItem key={idx}>
                          <ListItemIcon>
                            <CheckIcon color="success" fontSize="small" />
                          </ListItemIcon>
                          <ListItemText
                            primary={doc.title}
                            secondary={`Row ${doc.row} • ID: ${doc.id?.substring(0, 12)}...`}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </AccordionDetails>
                </Accordion>
              )}

              {uploadResult.errors?.length > 0 && (
                <Accordion sx={{ mt: 1 }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="subtitle2" color="error" sx={{ fontWeight: 600 }}>
                      ❌ Failed Rows ({uploadResult.errors.length})
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <List dense>
                      {uploadResult.errors.map((err, idx) => (
                        <ListItem key={idx}>
                          <ListItemIcon>
                            <ErrorIcon color="error" fontSize="small" />
                          </ListItemIcon>
                          <ListItemText
                            primary={`Row ${err.row}: ${err.error}`}
                            primaryTypographyProps={{ variant: 'body2' }}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </AccordionDetails>
                </Accordion>
              )}

              <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', mt: 3 }}>
                <Button onClick={handleReset} startIcon={<RefreshIcon />}>
                  Upload Another File
                </Button>
                <Button variant="contained" onClick={onCancel}>
                  Done
                </Button>
              </Box>
            </Box>
          ) : null}
        </Box>
      )}
    </Paper>
  );
};

export default CSVUpload;