const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const { sendOtp } = require('../utils/otpUtils');
const { sendMail, passwordResetConfirmTemplate } = require('../utils/emailService');

// @desc    Forgot password — validate ID + email, send OTP
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res) => {
    try {
        const { id, email } = req.body; // id = faculty_id or student registration number

        if (!id || !email) {
            return res.status(400).json({ success: false, message: 'ID and email are required' });
        }

        const result = await pool.query(
            'SELECT id, name, email, password_reset_count, password_reset_reset_at FROM users WHERE faculty_id = $1',
            [id]
        );

        // Always return same message — never reveal if ID exists or not
        if (result.rows.length === 0 || result.rows[0].email !== email) {
            return res.status(400).json({
                success: false,
                message: 'ID and email do not match our records. Please check and try again.'
            });
        }

        const user = result.rows[0];
        const now = new Date();
        const resetAt = user.password_reset_reset_at ? new Date(user.password_reset_reset_at) : null;

        // Check daily limit (3 resets per day)
        if (resetAt && now < resetAt && user.password_reset_count >= 3) {
            return res.status(429).json({
                success: false,
                message: 'Maximum reset attempts reached for today. Try again tomorrow.'
            });
        }

        // If reset window expired, clear the counter first
        if (!resetAt || now >= resetAt) {
            await pool.query(
                'UPDATE users SET password_reset_count = 0, password_reset_reset_at = NULL WHERE id = $1',
                [user.id]
            );
        }

        // Send OTP
        const otpResult = await sendOtp(user.id, user.name, user.email, 'reset', pool);
        if (!otpResult.allowed) {
            return res.status(429).json({ success: false, message: otpResult.error });
        }

        // Increment count, set reset_at to next midnight if not already set
        const nextMidnight = new Date();
        nextMidnight.setHours(24, 0, 0, 0);

        await pool.query(
            `UPDATE users SET
                password_reset_count = password_reset_count + 1,
                password_reset_reset_at = CASE
                    WHEN password_reset_reset_at IS NULL OR password_reset_reset_at < NOW()
                    THEN $1
                    ELSE password_reset_reset_at
                END
             WHERE id = $2`,
            [nextMidnight, user.id]
        );

        res.json({ success: true, userId: user.id, message: 'OTP sent to your registered email.' });

    } catch (error) {
        console.error('forgotPassword error:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

// @desc    Reset password — requires resetToken from verify-otp step
// @route   POST /api/auth/reset-password
// @access  Public (but requires short-lived resetToken in Authorization header)
exports.resetPassword = async (req, res) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ success: false, message: 'Reset token required' });
        }

        let decoded;
        try {
            decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET);
        } catch (e) {
            return res.status(401).json({ success: false, message: 'Reset token expired or invalid. Please start the forgot password process again.' });
        }

        if (decoded.purpose !== 'reset') {
            return res.status(401).json({ success: false, message: 'Invalid token type.' });
        }

        const { newPassword, confirmPassword } = req.body;

        if (!newPassword || !confirmPassword) {
            return res.status(400).json({ success: false, message: 'Both password fields are required' });
        }
        if (newPassword !== confirmPassword) {
            return res.status(400).json({ success: false, message: 'Passwords do not match' });
        }
        if (newPassword.length < 8) {
            return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
        }

        const userResult = await pool.query(
            'SELECT id, name, email FROM users WHERE id = $1',
            [decoded.userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const user = userResult.rows[0];
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update password + increment token_version to invalidate all existing sessions
        await pool.query(
            'UPDATE users SET password = $1, token_version = token_version + 1, updated_at = NOW() WHERE id = $2',
            [hashedPassword, user.id]
        );

        // Confirmation email — non-blocking (don't fail the request if email fails)
        try {
            await sendMail(user.email, 'Password Changed Successfully', passwordResetConfirmTemplate(user.name));
        } catch (emailErr) {
            console.error('Password reset confirmation email failed (non-fatal):', emailErr.message);
        }

        res.json({ success: true, message: 'Password reset successfully. Please log in.' });

    } catch (error) {
        console.error('resetPassword error:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};