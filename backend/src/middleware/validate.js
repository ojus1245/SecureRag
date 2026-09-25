const { validationResult, body, param, query, header, cookie } = require('express-validator');
const logger = require('../utils/logger');

/**
 * Validation Middleware
 * Validates request data using express-validator
 */
const validate = (validations, maybeRes, maybeNext) => {
  // If used directly as Express middleware: router.get('/...', [ ...rules ], validate, handler)
  if (validations && validations.headers && maybeRes && typeof maybeNext === 'function') {
    const req = validations;
    const res = maybeRes;
    const next = maybeNext;

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    const formattedErrors = errors.array().map(err => ({
      field: err.path || err.param || 'field',
      message: err.msg,
      value: err.value,
      location: err.location
    }));

    logger.warn('Validation failed:', {
      path: req.path,
      method: req.method,
      errors: formattedErrors,
      ip: req.ip
    });

    return res.status(400).json({
      success: false,
      message: 'Validation failed.',
      code: 'VALIDATION_ERROR',
      errors: formattedErrors
    });
  }

  return async (req, res, next) => {
    try {
      // Run all validations
      if (Array.isArray(validations)) {
        await Promise.all(validations.map(validation => validation.run(req)));
      } else if (validations && typeof validations.run === 'function') {
        await validations.run(req);
      }

      // Check for validation errors
      const errors = validationResult(req);
      
      if (errors.isEmpty()) {
        return next();
      }

      // Format validation errors
      const formattedErrors = errors.array().map(err => ({
        field: err.path || err.param || 'field',
        message: err.msg,
        value: err.value,
        location: err.location
      }));

      // Log validation failure
      logger.warn('Validation failed:', {
        path: req.path,
        method: req.method,
        errors: formattedErrors,
        ip: req.ip
      });

      return res.status(400).json({
        success: false,
        message: 'Validation failed.',
        code: 'VALIDATION_ERROR',
        errors: formattedErrors
      });
    } catch (error) {
      logger.error('Validation middleware error:', error);
      return res.status(500).json({
        success: false,
        message: 'Validation processing failed.',
        code: 'VALIDATION_SERVER_ERROR'
      });
    }
  };
};

/**
 * Common validation rules
 */
const commonValidations = {
  // MongoDB ObjectId validation
  mongoId: (field, location = 'params') => {
    return (location === 'params' ? param(field) : body(field))
      .isMongoId()
      .withMessage(`Invalid ${field} format`);
  },

  // UUID validation
  uuid: (field, location = 'params') => {
    return (location === 'params' ? param(field) : body(field))
      .isUUID()
      .withMessage(`Invalid ${field} format`);
  },

  // Email validation
  email: (field = 'email') => {
    return body(field)
      .trim()
      .isEmail()
      .withMessage('Invalid email address')
      .normalizeEmail();
  },

  // Password validation
  password: (field = 'password', minLength = 8) => {
    return body(field)
      .isLength({ min: minLength })
      .withMessage(`Password must be at least ${minLength} characters long`)
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('Password must contain uppercase, lowercase, number, and special character');
  },

  // Date validation
  date: (field, location = 'query') => {
    const validator = location === 'query' ? query(field) : body(field);
    return validator
      .optional()
      .isISO8601()
      .withMessage(`Invalid ${field} date format`);
  },

  // Pagination validation
  pagination: () => {
    return [
      query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer')
        .toInt(),
      query('limit')
        .optional()
        .isInt({ min: 1, max: 200 })
        .withMessage('Limit must be between 1 and 200')
        .toInt()
    ];
  },

  // Search validation
  search: (field = 'search') => {
    return query(field)
      .optional()
      .trim()
      .isLength({ max: 200 })
      .withMessage('Search query too long');
  },

  // String length validation
  stringLength: (field, min, max, location = 'body') => {
    const validator = location === 'body' ? body(field) : query(field);
    return validator
      .trim()
      .isLength({ min, max })
      .withMessage(`${field} must be between ${min} and ${max} characters`);
  }
};

/**
 * Sanitization middleware
 * Sanitizes request data to prevent XSS and injection attacks
 */
const sanitizeData = (req, res, next) => {
  try {
    // Sanitize body
    if (req.body) {
      Object.keys(req.body).forEach(key => {
        if (typeof req.body[key] === 'string') {
          // Remove HTML tags and trim
          req.body[key] = req.body[key].trim();
          // Escape special characters
          req.body[key] = req.body[key]
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;');
        }
      });
    }

    // Sanitize query parameters
    if (req.query) {
      Object.keys(req.query).forEach(key => {
        if (typeof req.query[key] === 'string') {
          req.query[key] = req.query[key].trim();
        }
      });
    }

    next();
  } catch (error) {
    logger.error('Sanitization error:', error);
    return res.status(500).json({
      success: false,
      message: 'Data sanitization failed.',
      code: 'SANITIZATION_ERROR'
    });
  }
};

/**
 * Content validation for documents
 */
const validateDocumentContent = [
  body('title')
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Title must be between 3 and 200 characters')
    .escape(),
  
  body('content')
    .optional()
    .isLength({ min: 1, max: 1000000 })
    .withMessage('Content is too long')
    .custom((value) => {
      // Check for malicious content patterns
      const maliciousPatterns = [
        /<script/i,
        /javascript:/i,
        /onerror/i,
        /onload/i,
        /onclick/i
      ];
      
      for (const pattern of maliciousPatterns) {
        if (pattern.test(value)) {
          throw new Error('Content contains potentially malicious code');
        }
      }
      return true;
    }),
  
  body('classification')
    .optional()
    .isIn(['public', 'internal', 'confidential', 'restricted'])
    .withMessage('Invalid classification level'),
  
  body('tags')
    .optional()
    .isArray({ max: 20 })
    .withMessage('Maximum 20 tags allowed')
    .custom((tags) => {
      tags.forEach(tag => {
        if (typeof tag !== 'string' || tag.length > 50) {
          throw new Error('Invalid tag format');
        }
      });
      return true;
    })
];

/**
 * File upload validation
 */
const validateFileUpload = [
  body('fileType')
    .optional()
    .isIn(['pdf', 'docx', 'txt', 'md', 'html', 'other'])
    .withMessage('Invalid file type'),
  
  body('fileSize')
    .optional()
    .isInt({ max: 10 * 1024 * 1024 })
    .withMessage('File size exceeds 10MB limit')
];

module.exports = {
  validate,
  sanitizeData,
  commonValidations,
  validateDocumentContent,
  validateFileUpload
};