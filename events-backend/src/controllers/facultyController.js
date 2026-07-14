const pool = require('../config/database');
const bcrypt = require('bcryptjs');

const listFaculty = async (req, res) => {
  const { search, department } = req.query;

  // CHANGED: subquery now joins through faculty_profile, since events.faculty_id
  // points to faculty_profile.id in G-Learn, not users.id directly
  let query = `SELECT u.id, u.faculty_id, u.name, u.email, u.department, u.designation, u.created_at,
               (SELECT COUNT(*) FROM events e
                JOIN faculty_profile fp ON e.faculty_id = fp.id
                WHERE fp.user_id = u.id) as total_events
               FROM users u WHERE u.role = 'faculty'`;
  const params = [];
  let idx = 1;

  if (search) {
    query += ` AND (u.name ILIKE $${idx} OR u.faculty_id ILIKE $${idx})`;
    params.push(`%${search}%`); idx++;
  }
  if (department) {
    query += ` AND u.department = $${idx++}`;
    params.push(department);
  }

  query += ' ORDER BY u.created_at DESC';

  try {
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('listFaculty error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

const createFaculty = async (req, res) => {
  const { name, faculty_id, email, department, designation, password } = req.body;

  if (!name || !faculty_id || !email || !department || !designation || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const client = await pool.connect(); // CHANGED: now uses a transaction client
  try {
    const existingId = await client.query('SELECT id FROM users WHERE faculty_id = $1', [faculty_id]);
    if (existingId.rows.length > 0) return res.status(400).json({ error: 'Faculty ID already registered' });

    const existingEmail = await client.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingEmail.rows.length > 0) return res.status(400).json({ error: 'Email already in use' });

    const hashedPassword = await bcrypt.hash(password, 10);

    await client.query('BEGIN'); // NEW

    const result = await client.query(
      `INSERT INTO users (name, faculty_id, email, password, department, designation, role, first_login)
       VALUES ($1, $2, $3, $4, $5, $6, 'faculty', true)
       RETURNING id, faculty_id, name, email, department, designation, role, created_at`,
      [name, faculty_id, email, hashedPassword, department, designation]
    );

    const newUser = result.rows[0];

    // NEW: create the matching faculty_profile row, since G-Learn requires both
    await client.query(
      `INSERT INTO faculty_profile (user_id) VALUES ($1)`,
      [newUser.id]
    );

    await client.query('COMMIT'); // NEW

    res.status(201).json(newUser);
  } catch (err) {
    await client.query('ROLLBACK'); // NEW
    console.error('createFaculty error:', err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release(); // NEW
  }
};

const updateProfile = async (req, res) => {
  const { name, department, designation } = req.body;
  try {
    const result = await pool.query(
      `UPDATE users SET name=$1, department=$2, designation=$3, updated_at=NOW()
       WHERE id=$4 RETURNING id, faculty_id, name, email, department, designation, role`,
      [name, department, designation, req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('updateProfile error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

const changePassword = async (req, res) => {
  const { current_password, new_password, confirm_password } = req.body;

  if (!current_password || !new_password || !confirm_password) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  if (new_password !== confirm_password) {
    return res.status(400).json({ error: 'New passwords do not match' });
  }

  try {
    const result = await pool.query('SELECT password FROM users WHERE id = $1', [req.user.id]);
    const user = result.rows[0];

    const isMatch = await bcrypt.compare(current_password, user.password);
    if (!isMatch) return res.status(400).json({ error: 'Current password is incorrect' });

    const hashed = await bcrypt.hash(new_password, 10);
    await pool.query('UPDATE users SET password=$1, updated_at=NOW() WHERE id=$2', [hashed, req.user.id]);

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('changePassword error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

const getMe = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, faculty_id, name, email, department, designation, role, mobile
       FROM users WHERE id = $1`,
      [req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('getMe error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { listFaculty, createFaculty, updateProfile, changePassword, getMe };