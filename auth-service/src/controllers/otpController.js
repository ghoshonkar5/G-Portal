const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const { verifyOTP, sendOtp } = require('../utils/otpUtils');
const { generateToken, formatUser } = require('../utils/jwtUtils');

// @desc    Verify OTP — returns full JWT, setupToken, or resetToken depending on purpose
// @route   POST /api/auth/verify-otp
// @access  Public
exports.verifyOtp = async (req, res) => {
    try {
        const { userId, otp, purpose } = req.body;

        if (!userId || !otp || !purpose) {
            return res.status(400).json({ success: false, message: 'userId, otp, and purpose are required' });
        }

        const result = await verifyOTP(userId, otp, pool);

        if (!result.success) {
            return res.status(400).json({ success: false, message: result.error });
        }

        // First login — return short-lived setupToken (not a full JWT)
        if (purpose === 'first_login') {
            const setupToken = jwt.sign(
                { userId, purpose: 'setup' },
                process.env.JWT_SECRET,
                { expiresIn: '15m' }
            );
            return res.json({ success: true, setupToken });
        }

        // Forgot password — return short-lived resetToken (not a full JWT)
        if (purpose === 'reset') {
            const resetToken = jwt.sign(
                { userId, purpose: 'reset' },
                process.env.JWT_SECRET,
                { expiresIn: '15m' }
            );
            return res.json({ success: true, resetToken });
        }

        // All login purposes (login, admin_login, google_login, student_login)
        // → return full JWT
        const userResult = await pool.query(
            `SELECT u.*, fp.id AS faculty_profile_id
             FROM users u
             LEFT JOIN faculty_profile fp ON fp.user_id = u.id
             WHERE u.id = $1`,
            [userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const user = userResult.rows[0];
        const token = generateToken(user);
        pool.query('INSERT INTO pl_user_sessions (user_id) VALUES ($1)', [user.id]).catch(err => console.warn('pl_user_sessions write failed:', err.message));

        res.json({ success: true, token, user: formatUser(user) });

    } catch (error) {
        console.error('verifyOtp error:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

// @desc    Resend OTP (rate-limited)
// @route   POST /api/auth/resend-otp
// @access  Public
exports.resendOtp = async (req, res) => {
    try {
        const { userId, purpose } = req.body;

        if (!userId || !purpose) {
            return res.status(400).json({ success: false, message: 'userId and purpose are required' });
        }

        const userResult = await pool.query(
            'SELECT name, email FROM users WHERE id = $1',
            [userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const { name, email } = userResult.rows[0];
        const result = await sendOtp(userId, name, email, purpose, pool);

        if (!result.allowed) {
            return res.status(429).json({ success: false, message: result.error });
        }

        res.json({ success: true, message: 'OTP resent successfully' });

    } catch (error) {
        console.error('resendOtp error:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};