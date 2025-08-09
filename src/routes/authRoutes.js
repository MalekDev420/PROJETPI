const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const mockAuthController = require('../controllers/mockAuthController');
const { authenticate } = require('../middleware/authMiddleware');
const mongoose = require('mongoose');

// Check if database is connected
const useController = mongoose.connection.readyState === 1 ? authController : mockAuthController;

// Validation rules
const registerValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('firstName')
    .trim()
    .notEmpty()
    .withMessage('First name is required'),
  body('lastName')
    .trim()
    .notEmpty()
    .withMessage('Last name is required'),
  body('department')
    .trim()
    .notEmpty()
    .withMessage('Department is required'),
  body('role')
    .optional()
    .isIn(['student', 'teacher', 'admin'])
    .withMessage('Invalid role')
];

const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

const changePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long')
];

// Public routes - Use mock controller if DB not connected
router.post('/register', registerValidation, (req, res) => {
  if (mongoose.connection.readyState === 1) {
    authController.register(req, res);
  } else {
    mockAuthController.mockRegister(req, res);
  }
});

router.post('/login', loginValidation, (req, res) => {
  if (mongoose.connection.readyState === 1) {
    authController.login(req, res);
  } else {
    mockAuthController.mockLogin(req, res);
  }
});

router.post('/refresh-token', (req, res) => {
  if (mongoose.connection.readyState === 1) {
    authController.refreshToken(req, res);
  } else {
    res.json({ success: true, data: { token: req.body.refreshToken, refreshToken: req.body.refreshToken }});
  }
});

// Protected routes
router.get('/profile', authenticate, (req, res) => {
  if (mongoose.connection.readyState === 1) {
    authController.getProfile(req, res);
  } else {
    mockAuthController.mockGetProfile(req, res);
  }
});

router.put('/profile', authenticate, authController.updateProfile);
router.post('/change-password', authenticate, changePasswordValidation, authController.changePassword);
router.post('/logout', authenticate, (req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
});

module.exports = router;