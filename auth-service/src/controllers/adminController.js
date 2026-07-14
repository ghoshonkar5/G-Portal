const bcrypt = require('bcryptjs');
const pool = require('../config/database');
const { sendMail, accountCreatedTemplate } = require('../utils/emailService');

// @desc    Create single user (faculty or student)
// @route   POST /api/admin/users
// @access  Private (Admin only)
exports.createUser = async (req, res) => {
    const client = await pool.connect();
    try {
        const { role, facultyId, name, email, department, designation, mobile } = req.body;

        // 1. Validate required fields
        if (!role || !facultyId || !name || !email) {
            return res.status(400).json({ success: false, message: 'role, facultyId, name, and email are required' });
        }

        // 2. Check role is either faculty, student, or admin
        if (role !== 'faculty' && role !== 'student' && role !== 'admin') {
            return res.status(400).json({ success: false, message: 'Role must be faculty, student, or admin' });
        }

        // 3. Check faculty_id and email are not already in users table
        const existing = await client.query(
            'SELECT id, faculty_id, email FROM users WHERE faculty_id = $1 OR email = $2',
            [facultyId.trim(), email.trim().toLowerCase()]
        );
        if (existing.rows.length > 0) {
            const row = existing.rows[0];
            if (row.email.toLowerCase() === email.trim().toLowerCase()) {
                return res.status(409).json({ success: false, message: 'Email already in use' });
            }
            return res.status(409).json({ success: false, message: 'Faculty ID already registered' });
        }

        // 4. Hash password = bcrypt(facultyId, 10)
        const hashedPassword = await bcrypt.hash(facultyId.trim(), 10);

        // 5. Begin transaction
        await client.query('BEGIN');

        // 6. INSERT into users
        const userResult = await client.query(
            `INSERT INTO users (faculty_id, name, email, password, role, department, designation, mobile,
                                first_login, profile_completed, is_active)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, false, true)
             RETURNING id, faculty_id, name, email, role, department, designation, mobile, is_active, first_login`,
            [
                facultyId.trim(),
                name.trim(),
                email.trim().toLowerCase(),
                hashedPassword,
                role,
                department || null,
                role === 'faculty' ? (designation || null) : null,
                mobile || null
            ]
        );

        const newUser = userResult.rows[0];

        // 7. If role is faculty: INSERT into faculty_profile
        if (role === 'faculty') {
            await client.query(
                `INSERT INTO faculty_profile (user_id) VALUES ($1) ON CONFLICT DO NOTHING`,
                [newUser.id]
            );
        }

        // 7b. If role is admin: also append email to ADMIN_EMAILS in .env
        if (role === 'admin') {
            try {
                const fs = require('fs');
                const path = require('path');
                const envPath = path.join(__dirname, '../../.env');
                if (fs.existsSync(envPath)) {
                    let envContent = fs.readFileSync(envPath, 'utf8');
                    const emailLower = newUser.email;
                    if (envContent.includes('ADMIN_EMAILS=')) {
                        const lines = envContent.split('\n');
                        const updatedLines = lines.map(line => {
                            if (line.startsWith('ADMIN_EMAILS=')) {
                                const currentEmails = line.replace('ADMIN_EMAILS=', '').split(',').map(e => e.trim()).filter(Boolean);
                                if (!currentEmails.includes(emailLower)) {
                                    currentEmails.push(emailLower);
                                    return `ADMIN_EMAILS=${currentEmails.join(',')}`;
                                }
                            }
                            return line;
                        });
                        fs.writeFileSync(envPath, updatedLines.join('\n'));
                        if (process.env.ADMIN_EMAILS && !process.env.ADMIN_EMAILS.includes(emailLower)) {
                            process.env.ADMIN_EMAILS += `,${emailLower}`;
                        }
                    } else {
                        fs.appendFileSync(envPath, `\nADMIN_EMAILS=${emailLower}\n`);
                        process.env.ADMIN_EMAILS = process.env.ADMIN_EMAILS ? `${process.env.ADMIN_EMAILS},${emailLower}` : emailLower;
                    }
                }
            } catch (envErr) {
                console.error('Failed to update .env with new admin email (non-fatal):', envErr.message);
            }
        }

        // 8. Commit transaction
        await client.query('COMMIT');

        // 9. Send welcome email (non-blocking)
        try {
            await sendMail(
                newUser.email,
                'Welcome to G-PORTAL - Account Created',
                accountCreatedTemplate(newUser.name, newUser.faculty_id, newUser.role)
            );
        } catch (emailErr) {
            console.error('Account creation email failed (non-fatal):', emailErr.message);
        }

        // 10. Return response
        res.status(201).json({
            success: true,
            user: newUser
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('createUser error:', error);
        res.status(500).json({ success: false, message: 'Server error creating user', error: error.message });
    } finally {
        client.release();
    }
};

// @desc    Bulk create users via CSV
// @route   POST /api/admin/users/bulk
// @access  Private (Admin only)
exports.bulkCreateUsers = async (req, res) => {
    const { role, users } = req.body;

    if (!role || (role !== 'faculty' && role !== 'student' && role !== 'admin')) {
        return res.status(400).json({ success: false, message: 'Valid role (faculty, student, or admin) is required' });
    }

    if (!Array.isArray(users) || users.length === 0) {
        return res.status(400).json({ success: false, message: 'Users array is required' });
    }

    // 1. Validate max 500 users per batch (as per Question 3 decision)
    if (users.length > 500) {
        return res.status(400).json({ success: false, message: 'Maximum 500 users per batch allowed' });
    }

    const client = await pool.connect();
    const createdUsers = [];
    const failures = [];

    try {
        await client.query('BEGIN');

        for (let i = 0; i < users.length; i++) {
            const u = users[i];
            const rowNum = i + 1;

            if (!u.facultyId || !u.name || !u.email) {
                failures.push({
                    row: rowNum,
                    facultyId: u.facultyId || 'N/A',
                    reason: 'Missing required fields (facultyId/student_id, name, or email)'
                });
                continue;
            }

            try {
                await client.query(`SAVEPOINT row_${i}`);
                const hashedPassword = await bcrypt.hash(String(u.facultyId).trim(), 10);

                const resUser = await client.query(
                    `INSERT INTO users (faculty_id, name, email, password, role, department, designation, mobile,
                                        first_login, profile_completed, is_active)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, false, true)
                     RETURNING id, faculty_id, name, email, role, department, designation, mobile, is_active, first_login`,
                    [
                        String(u.facultyId).trim(),
                        String(u.name).trim(),
                        String(u.email).trim().toLowerCase(),
                        hashedPassword,
                        role,
                        u.department ? String(u.department).trim() : null,
                        role === 'faculty' ? (u.designation ? String(u.designation).trim() : null) : null,
                        u.mobile ? String(u.mobile).trim() : null
                    ]
                );

                const newUser = resUser.rows[0];
                if (role === 'faculty') {
                    await client.query(
                        `INSERT INTO faculty_profile (user_id) VALUES ($1) ON CONFLICT DO NOTHING`,
                        [newUser.id]
                    );
                } else if (role === 'admin') {
                    try {
                        const fs = require('fs');
                        const path = require('path');
                        const envPath = path.join(__dirname, '../../.env');
                        if (fs.existsSync(envPath)) {
                            let envContent = fs.readFileSync(envPath, 'utf8');
                            const emailLower = newUser.email;
                            if (envContent.includes('ADMIN_EMAILS=')) {
                                const lines = envContent.split('\n');
                                const updatedLines = lines.map(line => {
                                    if (line.startsWith('ADMIN_EMAILS=')) {
                                        const currentEmails = line.replace('ADMIN_EMAILS=', '').split(',').map(e => e.trim()).filter(Boolean);
                                        if (!currentEmails.includes(emailLower)) {
                                            currentEmails.push(emailLower);
                                            return `ADMIN_EMAILS=${currentEmails.join(',')}`;
                                        }
                                    }
                                    return line;
                                });
                                fs.writeFileSync(envPath, updatedLines.join('\n'));
                                if (process.env.ADMIN_EMAILS && !process.env.ADMIN_EMAILS.includes(emailLower)) {
                                    process.env.ADMIN_EMAILS += `,${emailLower}`;
                                }
                            }
                        }
                    } catch (e) {
                        console.error('Failed to update .env inside bulkCreate (non-fatal):', e.message);
                    }
                }

                createdUsers.push(newUser);
                await client.query(`RELEASE SAVEPOINT row_${i}`);
            } catch (err) {
                await client.query(`ROLLBACK TO SAVEPOINT row_${i}`);
                let reason = err.message;
                if (err.code === '23505') { // Postgres unique constraint violation
                    if (err.detail && err.detail.includes('email')) {
                        reason = 'Email already in use';
                    } else {
                        reason = 'Faculty ID / Reg Number already registered';
                    }
                }
                failures.push({
                    row: rowNum,
                    facultyId: u.facultyId,
                    reason
                });
            }
        }

        await client.query('COMMIT');

        // Send welcome emails in background
        Promise.allSettled(
            createdUsers.map(u => sendMail(
                u.email,
                'Welcome to G-PORTAL - Account Created',
                accountCreatedTemplate(u.name, u.faculty_id, u.role)
            ))
        ).catch(e => console.error('Bulk email error:', e));

        res.json({
            success: true,
            summary: {
                total: users.length,
                created: createdUsers.length,
                failed: failures.length
            },
            failures
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('bulkCreateUsers error:', error);
        res.status(500).json({ success: false, message: 'Server error during bulk import', error: error.message });
    } finally {
        client.release();
    }
};

// @desc    List all users (with search + pagination)
// @route   GET /api/admin/users
// @access  Private (Admin only)
exports.listUsers = async (req, res) => {
    try {
        const { role, search, page = 1, limit = 20 } = req.query;
        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
        const offset = (pageNum - 1) * limitNum;

        const conditions = [];
        const params = [];
        let paramIndex = 1;

        if (role && (role === 'faculty' || role === 'student' || role === 'admin')) {
            conditions.push(`role = $${paramIndex++}`);
            params.push(role);
        }

        if (search && search.trim() !== '') {
            conditions.push(`(name ILIKE $${paramIndex} OR email ILIKE $${paramIndex} OR faculty_id ILIKE $${paramIndex} OR department ILIKE $${paramIndex})`);
            params.push(`%${search.trim()}%`);
            paramIndex++;
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        const countQuery = `SELECT COUNT(*) AS total FROM users ${whereClause}`;
        const countRes = await pool.query(countQuery, params);
        const total = parseInt(countRes.rows[0].total, 10) || 0;

        const usersQuery = `
            SELECT id, faculty_id, name, email, role, department, designation, mobile, is_active, first_login, profile_completed, created_at
            FROM users
            ${whereClause}
            ORDER BY id DESC
            LIMIT $${paramIndex++} OFFSET $${paramIndex++}
        `;
        const usersRes = await pool.query(usersQuery, [...params, limitNum, offset]);

        res.json({
            success: true,
            users: usersRes.rows,
            pagination: {
                total,
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil(total / limitNum)
            }
        });
    } catch (error) {
        console.error('listUsers error:', error);
        res.status(500).json({ success: false, message: 'Server error listing users', error: error.message });
    }
};

// @desc    Toggle user active status
// @route   PATCH /api/admin/users/:id/status
// @access  Private (Admin only)
exports.toggleUserStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { is_active } = req.body;

        if (typeof is_active !== 'boolean') {
            return res.status(400).json({ success: false, message: 'is_active boolean field required' });
        }

        const result = await pool.query(
            'UPDATE users SET is_active = $1, updated_at = NOW() WHERE id = $2 RETURNING id, faculty_id, name, email, role, is_active',
            [is_active, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.json({
            success: true,
            user: result.rows[0],
            message: `User account ${is_active ? 'activated' : 'deactivated'} successfully.`
        });
    } catch (error) {
        console.error('toggleUserStatus error:', error);
        res.status(500).json({ success: false, message: 'Server error updating user status', error: error.message });
    }
};

// @desc    Delete user
// @route   DELETE /api/admin/users/:id
// @access  Private (Admin only)
exports.deleteUser = async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;

        await client.query('BEGIN');

        // Check if user exists
        const checkRes = await client.query('SELECT id, name, faculty_id, role, first_login FROM users WHERE id = $1', [id]);
        if (checkRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Delete from faculty_profile first if exists
        await client.query('DELETE FROM faculty_profile WHERE user_id = $1', [id]);

        // Delete user
        const result = await client.query('DELETE FROM users WHERE id = $1 RETURNING id, name, faculty_id, role', [id]);

        await client.query('COMMIT');
        res.json({
            success: true,
            message: 'User deleted successfully',
            deletedUser: result.rows[0]
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('deleteUser error:', error);
        if (error.code === '23503') { // foreign key violation
            return res.status(409).json({
                success: false,
                message: 'Cannot delete user: they have associated records (events, publications, etc.). Please deactivate the account instead.'
            });
        }
        res.status(500).json({ success: false, message: 'Server error deleting user', error: error.message });
    } finally {
        client.release();
    }
};
