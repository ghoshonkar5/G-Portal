const jwt = require('jsonwebtoken');
const pool = require('../config/database');

// @desc    Verify JWT signature AND check token_version against the DB
exports.protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return res.status(401).json({ success: false, message: 'Not authorized, no token provided' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Check current token_version in DB against the one embedded in this token
        const result = await pool.query(
            'SELECT token_version, is_active FROM users WHERE id = $1',
            [decoded.id]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ success: false, message: 'Not authorized, user no longer exists' });
        }

        const currentUser = result.rows[0];

        if (!currentUser.is_active) {
            return res.status(401).json({ success: false, message: 'Not authorized, account is inactive' });
        }

        if (currentUser.token_version !== decoded.tokenVersion) {
            return res.status(401).json({ success: false, message: 'Session expired, please log in again' });
        }

        req.user = decoded;
        next();

    } catch (error) {
        return res.status(401).json({ success: false, message: 'Not authorized, token invalid or expired' });
    }
};

// @desc    Restrict route to admin role only — must run after protect
exports.adminOnly = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ success: false, message: 'Not authorized as admin' });
    }
};

exports.requireAdmin = exports.adminOnly;