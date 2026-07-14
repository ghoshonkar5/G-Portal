const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const { generateToken, formatUser } = require('../utils/jwtUtils');
const { sendOtp } = require('../utils/otpUtils');
const { sendMail, welcomeEmailTemplate } = require('../utils/emailService');

// @desc    Register new faculty user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
    const client = await pool.connect();
    try {
        const { facultyId, name, email, password, department, designation, mobile } = req.body;

        if (!facultyId || !name || !email || !password) {
            return res.status(400).json({ success: false, message: 'facultyId, name, email, and password are required' });
        }

        const existing = await client.query(
            'SELECT id FROM users WHERE faculty_id = $1 OR email = $2',
            [facultyId, email]
        );
        if (existing.rows.length > 0) {
            return res.status(400).json({ success: false, message: 'Faculty ID or email already registered' });
        }

        await client.query('BEGIN');

        const hashedPassword = await bcrypt.hash(password, 10);

        const userResult = await client.query(
            `INSERT INTO users (faculty_id, name, email, password, role, department, designation, mobile)
             VALUES ($1, $2, $3, $4, 'faculty', $5, $6, $7)
             RETURNING *`,
            [facultyId, name, email, hashedPassword, department || null, designation || null, mobile || null]
        );

        const user = userResult.rows[0];

        const profileResult = await client.query(
            `INSERT INTO faculty_profile (user_id) VALUES ($1) RETURNING id`,
            [user.id]
        );
        user.faculty_profile_id = profileResult.rows[0].id;

        await client.query('COMMIT');

        const token = generateToken(user);

        res.status(201).json({
            success: true,
            message: 'Registration successful',
            token,
            user: formatUser(user)
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Register error:', error);
        res.status(500).json({ success: false, message: 'Registration failed', error: error.message });
    } finally {
        client.release();
    }
};

// @desc    Login
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
    try {
        const { facultyId, password } = req.body;

        if (!facultyId || !password) {
            return res.status(400).json({ success: false, message: 'facultyId and password are required' });
        }

        const result = await pool.query(
            `SELECT u.*, fp.id AS faculty_profile_id
             FROM users u
             LEFT JOIN faculty_profile fp ON fp.user_id = u.id
             WHERE u.faculty_id = $1`,
            [facultyId]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const user = result.rows[0];
        const isValid = await bcrypt.compare(password, user.password);

        if (!isValid) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        if (!user.is_active) {
            return res.status(401).json({ success: false, message: 'Account deactivated. Contact admin.' });
        }

        // Admin login requires Google OAuth verification first!
        if (user.role === 'admin' && !req.body.google_verified) {
            return res.status(401).json({
                success: false,
                message: 'Admin access requires Google OAuth verification first. Please click "Admin? Sign in with Google" below.'
            });
        }

        // First login — redirect to setup flow
        if (user.first_login) {
            return res.status(200).json({
                success: true,
                firstLogin: true,
                message: 'Please complete your first time account setup.'
            });
        }

        // Students skip OTP on ID+password login — straight JWT
        if (user.role === 'student') {
            const token = generateToken(user);
            pool.query('INSERT INTO pl_user_sessions (user_id) VALUES ($1)', [user.id]).catch(err => console.warn('pl_user_sessions write failed:', err.message));
            return res.json({ success: true, token, user: formatUser(user) });
        }

        // DEV_MODE — skip OTP, return JWT directly for testing
        if (process.env.DEV_MODE === 'true') {
            const token = generateToken(user);
            pool.query('INSERT INTO pl_user_sessions (user_id) VALUES ($1)', [user.id]).catch(err => console.warn('pl_user_sessions write failed:', err.message));
            return res.json({ success: true, token, user: formatUser(user), devMode: true });
        }

        // Send OTP
        const otpResult = await sendOtp(user.id, user.name, user.email, 'login', pool);
        if (!otpResult.allowed) {
            return res.status(429).json({ success: false, message: otpResult.error });
        }

        res.json({
            success: true,
            requiresOtp: true,
            userId: user.id,
            message: 'OTP sent to your registered email.'
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: 'Login failed', error: error.message });
    }
};

// @desc    Get current logged-in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT u.*, fp.id AS faculty_profile_id,
                    fp.google_scholar_url, fp.scopus_url, fp.scopus_url_2, fp.scopus_url_3,
                    fp.wos_url, fp.wos_url_2, fp.wos_url_3,
                    fp.research_area, fp.office_room, fp.office_hours, fp.courses_taught,
                    fp.roles, fp.linkedin_url, fp.website_url, fp.profile_photo, fp.years_of_experience
             FROM users u
             LEFT JOIN faculty_profile fp ON fp.user_id = u.id
             WHERE u.id = $1`,
            [req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.json({ success: true, user: formatUser(result.rows[0]) });

    } catch (error) {
        console.error('GetMe error:', error);
        res.status(500).json({ success: false, message: 'Error fetching user', error: error.message });
    }
};

// @desc    Invalidate all existing tokens for current user
// @route   POST /api/auth/logout-all
// @access  Private
exports.logoutAll = async (req, res) => {
    try {
        const result = await pool.query(
            'UPDATE users SET token_version = token_version + 1 WHERE id = $1 RETURNING token_version',
            [req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.json({
            success: true,
            message: 'Logged out of all devices. Please log in again.',
            tokenVersion: result.rows[0].token_version
        });

    } catch (error) {
        console.error('LogoutAll error:', error);
        res.status(500).json({ success: false, message: 'Error logging out', error: error.message });
    }
};

// ── First Login Flow ──────────────────────────────────────

// @desc    Step 1 — Verify faculty_id is valid + pending first login, then send OTP
// @route   POST /api/auth/first-login/check-id
// @access  Public
exports.checkFirstLoginId = async (req, res) => {
    try {
        const { facultyId } = req.body;

        if (!facultyId) {
            return res.status(400).json({ success: false, message: 'facultyId is required' });
        }

        const result = await pool.query(
            'SELECT id, faculty_id, name, email, role, first_login FROM users WHERE faculty_id = $1',
            [facultyId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Faculty ID not recognized' });
        }

        const user = result.rows[0];

        if (!user.first_login) {
            return res.status(400).json({ success: false, message: 'Account already activated. Please log in normally.' });
        }

        // DEV_MODE — skip OTP
        if (process.env.DEV_MODE === 'true') {
            return res.json({
                success: true,
                userId: user.id,
                skipOtp: true,
                devMode: true,
                message: 'DEV: OTP skipped.'
            });
        }

        // Send OTP
        const otpResult = await sendOtp(user.id, user.name, user.email, 'first_login', pool);
        if (!otpResult.allowed) {
            return res.status(429).json({ success: false, message: otpResult.error });
        }

        res.json({
            success: true,
            userId: user.id,
            skipOtp: false,
            message: 'OTP sent to your registered email.'
        });

    } catch (error) {
        console.error('checkFirstLoginId error:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

// @desc    Step 3 — Set new password after OTP verified (setupToken required)
// @route   POST /api/auth/first-login/set-password
// @access  Public (requires setupToken in Authorization header, or skipOtp + userId for students/dev)
exports.setFirstLoginPassword = async (req, res) => {
    try {
        const { newPassword, confirmPassword, userId: bodyUserId, skipOtp } = req.body;
        const authHeader = req.headers.authorization;

        let userId;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            // Normal path — OTP was verified, setupToken was issued
            let decoded;
            try {
                decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET);
            } catch (e) {
                return res.status(401).json({ success: false, message: 'Setup token expired or invalid. Please start again.' });
            }
            if (decoded.purpose !== 'setup') {
                return res.status(401).json({ success: false, message: 'Invalid token type.' });
            }
            userId = decoded.userId;
        } else if (bodyUserId && skipOtp) {
            // Student or DEV_MODE path — no OTP step
            userId = bodyUserId;
        } else {
            return res.status(401).json({ success: false, message: 'Setup token required' });
        }

        if (!newPassword || !confirmPassword) {
            return res.status(400).json({ success: false, message: 'Both password fields are required' });
        }
        if (newPassword !== confirmPassword) {
            return res.status(400).json({ success: false, message: 'Passwords do not match' });
        }
        if (newPassword.length < 8) {
            return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
        }

        const result = await pool.query(
            `SELECT u.*, fp.id AS faculty_profile_id
             FROM users u
             LEFT JOIN faculty_profile fp ON fp.user_id = u.id
             WHERE u.id = $1`,
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const user = result.rows[0];

        if (!user.first_login) {
            return res.status(400).json({ success: false, message: 'Account already activated.' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await pool.query(
            'UPDATE users SET password = $1, first_login = false, updated_at = NOW() WHERE id = $2',
            [hashedPassword, user.id]
        );

        if (user.role === 'faculty') {
            await pool.query(
                `INSERT INTO faculty_profile (user_id) VALUES ($1) ON CONFLICT DO NOTHING`,
                [userId]
            );
        }

        // Welcome email — non-blocking
        try {
            await sendMail(user.email, 'Welcome to G-PORTAL', welcomeEmailTemplate(user.name, user.faculty_id));
        } catch (emailErr) {
            console.error('Welcome email failed (non-fatal):', emailErr.message);
        }

        // Return full JWT — user goes straight to onboarding
        const token = generateToken({ ...user, first_login: false });

        res.json({
            success: true,
            message: 'Password set successfully.',
            token,
            user: formatUser({ ...user, first_login: false })
        });

    } catch (error) {
        console.error('setFirstLoginPassword error:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};