const pool = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      faculty_id: user.faculty_id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      designation: user.designation
    },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );
};

const register = async (req, res) => {
  const { name, faculty_id, email, password, confirm_password, department, designation } = req.body;

  if (!name || !faculty_id || !email || !password || !confirm_password || !department || !designation) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  if (password !== confirm_password) {
    return res.status(400).json({ error: 'Passwords do not match' });
  }

  try {
    const existingId = await pool.query('SELECT id FROM users WHERE faculty_id = $1', [faculty_id]);
    if (existingId.rows.length > 0) {
      return res.status(400).json({ error: 'Faculty ID already registered' });
    }

    const existingEmail = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingEmail.rows.length > 0) {
      return res.status(400).json({ error: 'Email already in use' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (name, faculty_id, email, password, department, designation, role)
       VALUES ($1, $2, $3, $4, $5, $6, 'faculty')
       RETURNING id, faculty_id, name, email, department, designation, role`,
      [name, faculty_id, email, hashedPassword, department, designation]
    );

    const user = result.rows[0];
    const token = generateToken(user);

    res.status(201).json({ token, user });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

const login = async (req, res) => {
  const { faculty_id, password } = req.body;

  if (!faculty_id || !password) {
    return res.status(400).json({ error: 'Faculty ID and password are required' });
  }

  try {
    const result = await pool.query(
      'SELECT id, faculty_id, name, email, password, department, designation, role FROM users WHERE faculty_id = $1',
      [faculty_id]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken(user);

    res.json({
      token,
      user: {
        id: user.id,
        faculty_id: user.faculty_id,
        name: user.name,
        email: user.email,
        department: user.department,
        designation: user.designation,
        role: user.role
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { register, login };