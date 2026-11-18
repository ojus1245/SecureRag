// Document Classification Levels
export const CLASSIFICATION_LEVELS = [
  'public',
  'internal',
  'confidential',
  'restricted'
];

// Classification Level Objects (for UI dropdowns/radios)
export const CLASSIFICATION_OPTIONS = [
  {
    value: 'public',
    label: 'Public',
    description: 'Available to everyone',
    color: 'success',
    level: 1
  },
  {
    value: 'internal',
    label: 'Internal',
    description: 'Available within organization',
    color: 'info',
    level: 2
  },
  {
    value: 'confidential',
    label: 'Confidential',
    description: 'Restricted access',
    color: 'warning',
    level: 3
  },
  {
    value: 'restricted',
    label: 'Restricted',
    description: 'Highest security level',
    color: 'error',
    level: 4
  }
];

// Document Status
export const DOCUMENT_STATUS = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  ARCHIVED: 'archived',
  DELETED: 'deleted'
};

export const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft', color: 'default' },
  { value: 'published', label: 'Published', color: 'success' },
  { value: 'archived', label: 'Archived', color: 'warning' },
  { value: 'deleted', label: 'Deleted', color: 'error' }
];

// File Types
export const FILE_TYPES = [
  'pdf',
  'txt',
  'docx',
  'doc',
  'md',
  'html',
  'csv',
  'json',
  'other'
];

// File Type Options (for dropdowns)
export const FILE_TYPE_OPTIONS = [
  { value: 'pdf', label: 'PDF Document' },
  { value: 'txt', label: 'Text File' },
  { value: 'docx', label: 'Word Document' },
  { value: 'md', label: 'Markdown' },
  { value: 'html', label: 'HTML' },
  { value: 'csv', label: 'CSV File' },
  { value: 'json', label: 'JSON File' },
  { value: 'other', label: 'Other' }
];

// File Size Limits
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const MAX_TOTAL_SIZE = 50 * 1024 * 1024; // 50MB for batch uploads

// Allowed MIME Types for react-dropzone v14
export const ALLOWED_MIME_TYPES = {
  'application/pdf': ['.pdf'],
  'text/plain': ['.txt'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'text/markdown': ['.md'],
  'text/html': ['.html', '.htm'],
  'text/csv': ['.csv'],
  'application/json': ['.json']
};

// File Extension to MIME Type Mapping
export const FILE_EXTENSION_MIME_MAP = {
  'pdf': 'application/pdf',
  'txt': 'text/plain',
  'doc': 'application/msword',
  'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'md': 'text/markdown',
  'html': 'text/html',
  'htm': 'text/html',
  'csv': 'text/csv',
  'json': 'application/json'
};

// MIME Type to File Extension Mapping
export const MIME_TYPE_EXTENSION_MAP = {
  'application/pdf': 'pdf',
  'text/plain': 'txt',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'text/markdown': 'md',
  'text/html': 'html',
  'text/csv': 'csv',
  'application/json': 'json'
};

// Departments
export const DEPARTMENTS = [
  'IT',
  'HR',
  'Finance',
  'Marketing',
  'Sales',
  'Operations',
  'Legal',
  'R&D',
  'Engineering',
  'Support'
];

// Document Permissions
export const DOCUMENT_PERMISSIONS = {
  READ: 'read',
  WRITE: 'write',
  DELETE: 'delete',
  SHARE: 'share',
  DOWNLOAD: 'download',
  EXPORT: 'export',
  ANNOTATE: 'annotate'
};

export const PERMISSION_OPTIONS = [
  { value: 'read', label: 'Read', description: 'View document content' },
  { value: 'write', label: 'Write', description: 'Edit document' },
  { value: 'delete', label: 'Delete', description: 'Delete document' },
  { value: 'share', label: 'Share', description: 'Share with others' },
  { value: 'download', label: 'Download', description: 'Download document' },
  { value: 'export', label: 'Export', description: 'Export document' },
  { value: 'annotate', label: 'Annotate', description: 'Add annotations' }
];

// Document Sort Options
export const SORT_OPTIONS = [
  { value: 'createdAt', label: 'Date Created' },
  { value: 'updatedAt', label: 'Date Modified' },
  { value: 'title', label: 'Title' },
  { value: 'classification', label: 'Classification' },
  { value: 'department', label: 'Department' },
  { value: 'fileSize', label: 'File Size' }
];

// Pagination Defaults
export const DEFAULT_PAGE_SIZE = 20;
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

// Classification Colors
export const CLASSIFICATION_COLORS = {
  public: {
    main: '#4caf50',
    light: '#e8f5e9',
    dark: '#2e7d32',
    text: '#1b5e20'
  },
  internal: {
    main: '#2196f3',
    light: '#e3f2fd',
    dark: '#1565c0',
    text: '#0d47a1'
  },
  confidential: {
    main: '#ff9800',
    light: '#fff3e0',
    dark: '#e65100',
    text: '#bf360c'
  },
  restricted: {
    main: '#f44336',
    light: '#ffebee',
    dark: '#c62828',
    text: '#b71c1c'
  }
};

// Helper function to get classification level
export const getClassificationLevel = (classification) => {
  const levels = { public: 1, internal: 2, confidential: 3, restricted: 4 };
  return levels[classification] || 1;
};

// Helper function to check if user has clearance for classification
export const hasClearanceFor = (userClearance, docClassification) => {
  return getClassificationLevel(userClearance) >= getClassificationLevel(docClassification);
};

// Helper function to get file extension from filename
export const getFileExtension = (filename) => {
  if (!filename) return '';
  return filename.split('.').pop().toLowerCase();
};

// Helper function to get MIME type from filename
export const getMimeType = (filename) => {
  const ext = getFileExtension(filename);
  return FILE_EXTENSION_MIME_MAP[ext] || 'application/octet-stream';
};

// Helper function to check if file type is allowed
export const isFileTypeAllowed = (filename) => {
  const ext = getFileExtension(filename);
  return FILE_TYPES.includes(ext);
};

// Helper function to format file size
export const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const size = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, size)).toFixed(1)} ${units[size]}`;
};

// Default export with all constants
export default {
  CLASSIFICATION_LEVELS,
  CLASSIFICATION_OPTIONS,
  CLASSIFICATION_COLORS,
  DOCUMENT_STATUS,
  STATUS_OPTIONS,
  FILE_TYPES,
  FILE_TYPE_OPTIONS,
  MAX_FILE_SIZE,
  MAX_TOTAL_SIZE,
  ALLOWED_MIME_TYPES,
  FILE_EXTENSION_MIME_MAP,
  MIME_TYPE_EXTENSION_MAP,
  DEPARTMENTS,
  DOCUMENT_PERMISSIONS,
  PERMISSION_OPTIONS,
  SORT_OPTIONS,
  DEFAULT_PAGE_SIZE,
  PAGE_SIZE_OPTIONS,
  getClassificationLevel,
  hasClearanceFor,
  getFileExtension,
  getMimeType,
  isFileTypeAllowed,
  formatFileSize
};