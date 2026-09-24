const { body, validationResult } = require('express-validator');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false, 
      message: 'Validation failed', 
      errors: errors.array() 
    });
  }
  next();
};

const validateLogin = [
  body('facultyId')
    .trim()
    .notEmpty().withMessage('Faculty ID is required')
    .isLength({ max: 50 }).withMessage('Faculty ID too long'),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ max: 128 }).withMessage('Password too long'),
  handleValidationErrors
];

const validateOTP = [
  body('otp')
    .trim()
    .isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits')
    .isNumeric().withMessage('OTP must be numeric'),
  body('userId')
    .isInt({ min: 1 }).withMessage('Invalid user ID'),
  handleValidationErrors
];

const validatePasswordReset = [
  body('newPassword')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .isLength({ max: 128 }).withMessage('Password too long'),
  handleValidationErrors
];

module.exports = { validateLogin, validateOTP, validatePasswordReset };
