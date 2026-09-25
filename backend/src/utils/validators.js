const { body, param, query } = require('express-validator');

/**
 * Common validation rules
 */
const validators = {
  // MongoDB ObjectId validation
  mongoId: (field, location = 'params') => {
    const validator = location === 'params' ? param(field) : body(field);
    return validator
      .isMongoId()
      .withMessage(`Invalid ${field} format`);
  },

  // UUID validation
  uuid: (field, location = 'params') => {
    const validator = location === 'params' ? param(field) : body(field);
    return validator
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

  // Username validation
  username: (field = 'username') => {
    return body(field)
      .trim()
      .isLength({ min: 3, max: 50 })
      .withMessage('Username must be between 3 and 50 characters')
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage('Username can only contain letters, numbers, and underscores');
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

  // Date range validation
  dateRange: (startField = 'startDate', endField = 'endDate') => {
    return [
      query(startField)
        .optional()
        .isISO8601()
        .withMessage('Invalid start date format'),
      query(endField)
        .optional()
        .isISO8601()
        .withMessage('Invalid end date format')
    ];
  }
};

module.exports = validators;