const express = require('express');
const router = express.Router();
const documentController = require('../controllers/document.controller');
const { authenticate } = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');
const { checkDocumentAccess, checkDocumentPermission } = require('../middleware/documentACL');
const { validate } = require('../middleware/validate');
const { body } = require('express-validator');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// ============================================
// Multer Configuration
// ============================================

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = crypto.randomUUID();
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/markdown',
    'text/html',
    'application/json',
    'application/octet-stream'
  ];

  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExts = ['.pdf', '.doc', '.docx', '.txt', '.md', '.html', '.json', '.csv'];

  if (allowedTypes.includes(file.mimetype) || allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Allowed: PDF, DOC, DOCX, TXT, MD, HTML, JSON, CSV'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024
  }
});

const csvFileFilter = (req, file, cb) => {
  const isCSV =
    file.mimetype === 'text/csv' ||
    file.mimetype === 'application/vnd.ms-excel' ||
    file.mimetype === 'application/csv' ||
    file.mimetype === 'text/plain' ||
    file.originalname.toLowerCase().endsWith('.csv');

  if (isCSV) {
    cb(null, true);
  } else {
    cb(new Error('Only CSV files are allowed'), false);
  }
};

const csvUpload = multer({
  storage: storage,
  fileFilter: csvFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024
  }
});

// ============================================
// Validation Rules
// ============================================

const uploadDocumentValidation = [
  body('title')
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Title must be between 3 and 200 characters'),

  body('content')
    .optional({ checkFalsy: true })
    .custom((value, { req }) => {
      // If a file is uploaded (PDF, DOCX, TXT, etc.), content can be empty because backend extracts text from the buffer
      if (req.file) {
        return true;
      }
      // If no file was attached, content must not be empty
      if (!value || typeof value !== 'string' || value.trim().length === 0) {
        throw new Error('Content is required when not uploading a file');
      }
      return true;
    }),

  body('department')
    .trim()
    .notEmpty()
    .withMessage('Department is required'),

  body('classification')
    .optional()
    .isIn(['public', 'internal', 'confidential', 'restricted'])
    .withMessage('Invalid classification level'),

  body('tags')
    .optional()
    .custom((value) => {
      try {
        const parsed = typeof value === 'string' ? JSON.parse(value) : value;
        if (!Array.isArray(parsed)) {
          throw new Error('Tags must be an array');
        }
        if (parsed.length > 20) {
          throw new Error('Maximum 20 tags allowed');
        }
        return true;
      } catch (e) {
        if (e.message.includes('Maximum')) throw e;
        throw new Error('Tags must be a valid JSON array');
      }
    }),

  body('fileType')
    .optional()
    .isIn(['pdf', 'docx', 'txt', 'md', 'html', 'other', 'csv', 'json'])
    .withMessage('Invalid file type'),

  body('metadata')
    .optional()
    .custom((value) => {
      try {
        const parsed = typeof value === 'string' ? JSON.parse(value) : value;
        if (typeof parsed !== 'object' || Array.isArray(parsed) || parsed === null) {
          throw new Error('Metadata must be an object');
        }
        return true;
      } catch (e) {
        if (e.message.includes('Metadata must be')) throw e;
        throw new Error('Metadata must be a valid JSON object');
      }
    })
];

const updateDocumentValidation = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Title must be between 3 and 200 characters'),

  body('classification')
    .optional()
    .isIn(['public', 'internal', 'confidential', 'restricted'])
    .withMessage('Invalid classification level')
];

const shareDocumentValidation = [
  body('userId')
    .notEmpty()
    .withMessage('User ID is required')
    .isMongoId()
    .withMessage('Invalid user ID'),

  body('permissions')
    .isArray()
    .withMessage('Permissions must be an array')
    .custom((permissions) => {
      const validPermissions = ['read', 'write', 'delete', 'share', 'download'];
      return permissions.every(p => validPermissions.includes(p));
    })
    .withMessage('Invalid permissions'),

  body('expiresAt')
    .optional()
    .isISO8601()
    .withMessage('Invalid expiry date format')
];

// ============================================
// All routes require authentication
// ============================================

router.use(authenticate);

// ============================================
// SPECIFIC ROUTES (must be before /:documentId)
// ============================================

// Safety check
router.post(
  '/safety-check',
  authorize('document:create'),
  [body('text').notEmpty().withMessage('Text is required for safety check')],
  validate,
  documentController.checkSafety
);

// CSV analysis
router.post(
  '/analyze-csv',
  authorize('document:create'),
  csvUpload.single('file'),
  documentController.analyzeCSV
);

// CSV bulk upload
router.post(
  '/bulk-csv',
  authorize('document:create'),
  csvUpload.single('file'),
  documentController.bulkUploadCSV
);

// Stats
router.get(
  '/stats',
  authorize('document:read'),
  documentController.getDocumentStats
);

// Batch delete
router.post(
  '/batch/delete',
  authorize('document:delete', 'system:configure'),
  validate([
    body('documentIds')
      .isArray()
      .withMessage('documentIds must be an array')
      .custom((ids) => ids.length > 0 && ids.length <= 100)
      .withMessage('Batch size must be between 1 and 100 documents')
  ]),
  documentController.batchDeleteDocuments
);

// Batch update classification
router.post(
  '/batch/update-classification',
  authorize('document:update', 'system:configure'),
  validate([
    body('documentIds').isArray().withMessage('documentIds must be an array'),
    body('classification')
      .isIn(['public', 'internal', 'confidential', 'restricted'])
      .withMessage('Invalid classification level')
  ]),
  documentController.batchUpdateClassification
);

// ============================================
// Document CRUD Routes
// ============================================

router.route('/')
  .post(
    authorize('document:create'),
    upload.single('file'),
    validate(uploadDocumentValidation),
    documentController.uploadDocument
  )
  .get(
    authorize('document:read'),
    documentController.listDocuments
  );

// ============================================
// Individual Document Routes (with :documentId)
// ============================================

router.route('/:documentId')
  .get(
    authorize('document:read'),
    checkDocumentAccess,
    documentController.getDocument
  )
  .put(
    authorize('document:update'),
    checkDocumentAccess,
    checkDocumentPermission('write'),
    validate(updateDocumentValidation),
    documentController.updateDocument
  )
  .delete(
    authorize('document:delete'),
    checkDocumentAccess,
    checkDocumentPermission('delete'),
    documentController.deleteDocument
  );

// ============================================
// Document Sharing Routes
// ============================================

router.post(
  '/:documentId/share',
  authorize('document:share'),
  checkDocumentAccess,
  checkDocumentPermission('share'),
  validate(shareDocumentValidation),
  documentController.shareDocument
);

router.delete(
  '/:documentId/share/:userId',
  authorize('document:share'),
  checkDocumentAccess,
  documentController.removeShare
);

router.get(
  '/:documentId/acl',
  authorize('document:read'),
  checkDocumentAccess,
  documentController.getDocumentACL
);

// ============================================
// Document Version Routes
// ============================================

router.get(
  '/:documentId/versions',
  authorize('document:read'),
  checkDocumentAccess,
  documentController.getVersionHistory
);

// ============================================
// Document Download Route
// ============================================

router.get(
  '/:documentId/download',
  authorize('document:read'),
  checkDocumentAccess,
  checkDocumentPermission('download'),
  documentController.downloadDocument
);

// ============================================
// Archive & Favorite Routes
// ============================================

router.post(
  '/:documentId/archive',
  authorize('document:update', 'document:delete'),
  checkDocumentAccess,
  documentController.toggleArchive
);

router.post(
  '/:documentId/favorite',
  authorize('document:read'),
  checkDocumentAccess,
  documentController.toggleFavorite
);

module.exports = router;