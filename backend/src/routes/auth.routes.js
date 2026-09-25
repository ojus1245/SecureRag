const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');
const { validate } = require('../middleware/validate');
const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');

// Rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 requests per windowMs
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Login rate limiter (stricter)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 login attempts per windowMs
  message: {
    success: false,
    message: 'Too many login attempts. Account temporarily locked. Try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Validation rules
const registerValidation = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters')
    .matches(/^[a-zA-Z0-9_.-]+$/)
    .withMessage('Username can only contain letters, numbers, underscores, dashes, and dots'),
  
  body('email')
    .trim()
    .isEmail()
    .withMessage('Invalid email address')
    .normalizeEmail(),
  
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  
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
    .withMessage('Invalid security clearance level')
];

const loginValidation = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Invalid email address')
    .normalizeEmail(),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

const changePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, and one number')
];

// Public routes
router.post(
  '/register',
  authLimiter,
  validate(registerValidation),
  authController.register
);

router.post(
  '/login',
  loginLimiter,
  validate(loginValidation),
  authController.login
);

router.post(
  '/refresh-token',
  authLimiter,
  authController.refreshToken
);

router.post(
  '/forgot-password',
  authLimiter,
  validate([
    body('email')
      .trim()
      .isEmail()
      .withMessage('Invalid email address')
      .normalizeEmail()
  ]),
  authController.forgotPassword
);

router.post(
  '/reset-password',
  authLimiter,
  validate([
    body('token')
      .notEmpty()
      .withMessage('Reset token is required'),
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('New password must be at least 8 characters long')
  ]),
  authController.resetPassword
);

// Protected routes (require authentication)
router.use(authenticate);

router.post('/logout', authController.logout);
router.get('/me', authController.getCurrentUser);

router.post(
  '/change-password',
  validate(changePasswordValidation),
  authController.changePassword
);

// Admin-only routes
router.get(
  '/sessions',
  authorize('system:configure'),
  (req, res) => {
    // Get active sessions (would require session management)
    res.status(200).json({
      success: true,
      data: {
        sessions: []
      }
    });
  }
);

module.exports = router;