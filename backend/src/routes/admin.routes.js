const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const userController = require('../controllers/user.controller');
const { authenticate } = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');
const { param, body } = require('express-validator');
const { validate } = require('../middleware/validate');

// All admin routes require authentication
router.use(authenticate);

// Dashboard & Health routes (Manager / Admin)
router.get(
  '/dashboard',
  authorize('user:manage', 'role:manage', 'system:configure', 'audit:view'),
  adminController.getDashboard
);

router.get(
  '/health',
  authorize('system:configure', 'audit:view', 'user:manage'),
  adminController.getSystemHealth
);

// Users proxy routes (under /api/admin/users for consistency)
router.get(
  '/users',
  authorize('user:manage'),
  userController.getAllUsers
);

// Roles management routes
router.get(
  '/roles',
  authorize('role:manage', 'user:manage'),
  adminController.getRoles
);

router.post(
  '/roles',
  authorize('role:manage'),
  validate([
    body('name').trim().notEmpty().withMessage('Role name is required')
  ]),
  adminController.createRole
);

router.put(
  '/roles/:roleId',
  authorize('role:manage'),
  validate([
    param('roleId').isMongoId().withMessage('Invalid role ID')
  ]),
  adminController.updateRole
);

router.delete(
  '/roles/:roleId',
  authorize('role:manage'),
  validate([
    param('roleId').isMongoId().withMessage('Invalid role ID')
  ]),
  adminController.deleteRole
);

// Settings
router.get(
  '/settings',
  authorize('system:configure'),
  adminController.getSettings
);

router.put(
  '/settings',
  authorize('system:configure'),
  adminController.updateSettings
);

module.exports = router;

