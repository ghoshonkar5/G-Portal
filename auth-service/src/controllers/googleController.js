const { OAuth2Client } = require('google-auth-library');
const pool = require('../config/database');
const { sendOtp } = require('../utils/otpUtils');
const { generateToken, formatUser } = require('../utils/jwtUtils');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// @desc    Google auth — admin_login, faculty_login, student_login, user_login
// @route   POST /api/auth/google
// @access  Public
exports.handleGoogle = async (req, res) => {
    const { credential, purpose } = req.body;

    if (!credential || !purpose) {
        return res.status(400).json({ success: false, message: 'credential and purpose are required' });
    }

    try {
        const ticket = await client.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID
        });

        const payload = ticket.getPayload();
        const googleEmail = payload.email;
        const googleId = payload.sub;

        // ── ADMIN LOGIN ──────────────────────────────────────────────────
        if (purpose === 'admin_login') {
            const adminEmails = process.env.ADMIN_EMAILS ? process.env.ADMIN_EMAILS.split(',').map(e => e.trim()) : [];
            const adminCheck = await pool.query("SELECT id, email, role FROM users WHERE email = $1 AND role = 'admin'", [googleEmail]);
            
            if (!adminEmails.includes(googleEmail) && adminCheck.rows.length === 0) {
                return res.status(401).json({
                    success: false,
                    message: 'This Google account is not authorized for admin access.'
                });
            }
            // Google verified — frontend now reveals ID + password fields
            return res.json({ success: true, googleVerified: true, email: googleEmail });
        }

        // ── UNIFIED USER LOGIN / FACULTY / STUDENT ───────────────────────
        if (purpose === 'user_login' || purpose === 'faculty_login' || purpose === 'student_login') {
            const userResult = await pool.query(
                `SELECT u.*, fp.id AS faculty_profile_id 
                 FROM users u 
                 LEFT JOIN faculty_profile fp ON fp.user_id = u.id 
                 WHERE u.email = $1`,
                [googleEmail]
            );

            if (userResult.rows.length === 0) {
                return res.status(401).json({ success: false, message: 'No portal account found for this Google email address.' });
            }

            const user = userResult.rows[0];

            if (!user.is_active) {
                return res.status(401).json({ success: false, message: 'Account deactivated. Contact admin.' });
            }

            // Auto-link google_id if not linked yet or update if needed
            if (!user.google_id || user.google_id !== googleId) {
                await pool.query('UPDATE users SET google_id = $1, google_linked_at = NOW() WHERE id = $2', [googleId, user.id]);
                user.google_id = googleId;
            }

            // If user is an admin, trigger the admin gate so frontend switches to Admin Form!
            if (user.role === 'admin') {
                return res.json({ success: true, adminGate: true, googleVerified: true, email: googleEmail });
            }

            // Send OTP when logging in via Gmail/Google
            const otpResult = await sendOtp(user.id, user.name, user.email, 'google_login', pool);
            if (!otpResult.allowed) {
                return res.status(429).json({ success: false, message: otpResult.error });
            }

            return res.json({ success: true, requiresOtp: true, userId: user.id, message: 'OTP sent to your registered email.' });
        }

        return res.status(400).json({ success: false, message: 'Invalid purpose.' });

    } catch (error) {
        console.error('Google auth error:', error);
        res.status(401).json({ success: false, message: 'Google verification failed. Please try again.' });
    }
};

// @desc    Link Google account to logged-in user's portal account
// @route   POST /api/auth/google/link
// @access  Protected
exports.linkGoogle = async (req, res) => {
    const { credential } = req.body;

    if (!credential) {
        return res.status(400).json({ success: false, message: 'credential is required' });
    }

    try {
        const ticket = await client.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID
        });

        const payload = ticket.getPayload();
        const googleEmail = payload.email;
        const googleId = payload.sub;

        const userResult = await pool.query(
            'SELECT email FROM users WHERE id = $1',
            [req.user.id]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        if (userResult.rows[0].email !== googleEmail) {
            return res.status(400).json({
                success: false,
                message: 'This Google account email does not match your registered portal email. Please sign in with your registered email account.'
            });
        }

        // Make sure this googleId isn't already linked to someone else
        const existing = await pool.query(
            'SELECT id FROM users WHERE google_id = $1',
            [googleId]
        );

        if (existing.rows.length > 0 && existing.rows[0].id !== req.user.id) {
            return res.status(400).json({ success: false, message: 'This Google account is already linked to another portal account.' });
        }

        await pool.query(
            'UPDATE users SET google_id = $1, google_linked_at = NOW(), updated_at = NOW() WHERE id = $2',
            [googleId, req.user.id]
        );

        res.json({ success: true, message: 'Google account linked successfully.' });

    } catch (error) {
        console.error('linkGoogle error:', error);
        res.status(401).json({ success: false, message: 'Google verification failed. Please try again.' });
    }
};

// @desc    Unlink Google account
// @route   POST /api/auth/google/unlink
// @access  Protected
exports.unlinkGoogle = async (req, res) => {
    try {
        await pool.query(
            'UPDATE users SET google_id = NULL, google_linked_at = NULL, updated_at = NOW() WHERE id = $1',
            [req.user.id]
        );
        res.json({ success: true, message: 'Google account unlinked successfully.' });
    } catch (error) {
        console.error('unlinkGoogle error:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};