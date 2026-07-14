const express = require('express');
const router = express.Router();

const { register, login, getMe, logoutAll, checkFirstLoginId, setFirstLoginPassword } = require('../controllers/authController');
const { verifyOtp, resendOtp } = require('../controllers/otpController');
const { handleGoogle, linkGoogle, unlinkGoogle } = require('../controllers/googleController');
const { forgotPassword, resetPassword } = require('../controllers/passwordController');
const { protect, requireAdmin } = require('../middleware/authMiddleware');

// ── Admin Only ────────────────────────────────────────────
router.post('/register', protect, requireAdmin, register);
router.post('/login', login);

// First login setup
router.post('/first-login/check-id', checkFirstLoginId);
router.post('/first-login/set-password', setFirstLoginPassword);

// OTP
router.post('/verify-otp', verifyOtp);
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