const express = require('express');
const router = express.Router();

const { register, login, getMe, logoutAll, checkFirstLoginId, setFirstLoginPassword } = require('../controllers/authController');
const { verifyOtp, resendOtp } = require('../controllers/otpController');
const { handleGoogle, linkGoogle, unlinkGoogle } = require('../controllers/googleController');
const { forgotPassword, resetPassword } = require('../controllers/passwordController');
const { protect, requireAdmin } = require('../middleware/authMiddleware');
const { validateLogin, validateOTP, validatePasswordReset } = require('../middleware/validateInput');

// A07 — Login rate limiting (10 attempts / 15 min / IP)
const rateLimit = require('express-rate-limit');
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many login attempts. Try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ── Admin Only ────────────────────────────────────────────
router.post('/register', protect, requireAdmin, register);
router.post('/login', loginLimiter, validateLogin, login);

// First login setup
router.post('/first-login/check-id', checkFirstLoginId);
router.post('/first-login/set-password', validatePasswordReset, setFirstLoginPassword);

// OTP
router.post('/verify-otp', validateOTP, verifyOtp);
router.post('/resend-otp', resendOtp);

// Google (login purposes only — link is protected below)
router.post('/google', handleGoogle);

// Forgot / Reset password
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// ── Protected ─────────────────────────────────────────────
router.get('/me', protect, getMe);
router.post('/logout-all', protect, logoutAll);
router.post('/google/link', protect, linkGoogle);
router.post('/google/unlink', protect, unlinkGoogle);

module.exports = router;