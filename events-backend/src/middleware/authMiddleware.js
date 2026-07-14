const jwt = require('jsonwebtoken');
const pool = require('../config/database');
require('dotenv').config();

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // NEW: check current token_version and is_active in G-Learn against the token's embedded values
    const result = await pool.query(
      'SELECT token_version, is_active FROM users WHERE id = $1',
      [decoded.id]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Not authorized, user no longer exists' });
    }

    const currentUser = result.rows[0];

    if (!currentUser.is_active) {
      return res.status(401).json({ error: 'Not authorized, account is inactive' });
    }

    if (currentUser.token_version !== decoded.tokenVersion) {
      return res.status(401).json({ error: 'Session expired, please log in again' });
    }

    req.user = decoded;
    next();

  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

module.exports = { verifyToken };