const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { authenticate } = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');
const { validate } = require('../middleware/validate');
const { body, param, query } = require('express-validator');

// Validation rules
const createUserValidation = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  
  body('email')
    .trim()
    .isEmail()
    .withMessage('Invalid email address')
    .normalizeEmail(),
  
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain uppercase, lowercase, number, and special character'),
  
  body('fullName')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Full name must be between 2 and 100 characters'),
  
  body('department')
    .trim()
    .notEmpty()
    .withMessage('Department is required'),
  
  body('securityClearance')
    .optional()
    .isIn(['public', 'internal', 'confidential', 'restricted'])
    .withMessage('Invalid security clearance level'),
  
  body('roleId')
    .optional()
    .isMongoId()
    .withMessage('Invalid role ID')
];

const updateUserValidation = [
  body('fullName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Full name must be between 2 and 100 characters'),
  
  body('department')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Department cannot be empty'),
  
  body('securityClearance')
    .optional()
    .isIn(['public', 'internal', 'confidential', 'restricted'])
    .withMessage('Invalid security clearance level'),
  
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
  
  body('preferences')
    .optional()
    .isObject()
    .withMessage('Preferences must be an object')
];

const updateRoleValidation = [
  body('roleId')
    .notEmpty()
    .withMessage('Role ID is required')
    .isMongoId()
    .withMessage('Invalid role ID')
];

// All routes require authentication
router.use(authenticate);

// User management routes (Admin/Manager access)
router.route('/')
  .get(
    authorize('user:manage'),
    userController.getAllUsers
  )
  .post(
    authorize('user:manage'),
    validate(createUserValidation),
    userController.createUser
  );

// Individual user routes
router.route('/:userId')
  .get(
    authorize('user:manage'),
    validate([
      param('userId')
        .isMongoId()
        .withMessage('Invalid user ID')
    ]),
    userController.getUserById
  )
  .put(
    authorize('user:manage'),
    validate([
      param('userId')
        .isMongoId()
        .withMessage('Invalid user ID'),
      ...updateUserValidation
    ]),
    userController.updateUser
  )
  .delete(
    authorize('user:manage'),
    validate([
      param('userId')
        .isMongoId()
        .withMessage('Invalid user ID')
    ]),
    userController.deleteUser
  );

// Role management
router.patch(
  '/:userId/role',
  authorize('role:manage'),
  validate([
    param('userId')
      .isMongoId()
      .withMessage('Invalid user ID'),
    ...updateRoleValidation
  ]),
  userController.updateUserRole
);

// User documents
router.get(
  '/:userId/documents',
  authorize('user:manage', 'document:read'),
  validate([
    param('userId')
      .isMongoId()
      .withMessage('Invalid user ID')
  ]),
  userController.getUserDocuments
);

// User activity
router.get(
  '/:userId/activity',
  authorize('audit:view', 'user:manage'),
  validate([
    param('userId')
      .isMongoId()
      .withMessage('Invalid user ID')
  ]),
  userController.getUserActivity
);

// Batch operations (Admin only)
router.post(
  '/batch/deactivate',
  authorize('user:manage'),
  validate([
    body('userIds')
      .isArray()
      .withMessage('userIds must be an array')
      .custom((ids) => ids.length > 0 && ids.length <= 100)
      .withMessage('Batch size must be between 1 and 100 users')
  ]),
  userController.batchDeactivateUsers
);

router.post(
  '/batch/update-department',
  authorize('user:manage'),
  validate([
    body('userIds')
      .isArray()
      .withMessage('userIds must be an array'),
    body('department')
      .trim()
      .notEmpty()
      .withMessage('Department is required')
  ]),
  userController.batchUpdateDepartment
);

module.exports = router;