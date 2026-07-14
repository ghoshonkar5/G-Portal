const pool = require('../config/database');

// Admin creates one or multiple flags
exports.createFlags = async (req, res) => {
    try {
        const { flags, flaggedBy } = req.body;
        const inserted = [];
        for (const flag of flags) {
            const result = await pool.query(
                `INSERT INTO flags (item_type, item_id, reason, flagged_by)
                 VALUES ($1, $2, $3, $4) RETURNING *`,
                [flag.itemType, flag.itemId, flag.reason, flaggedBy || 'Admin']
            );
            inserted.push(result.rows[0]);
        }
        res.status(201).json({ success: true, data: inserted });
    } catch (error) {
        console.error('Create flags error:', error);
        res.status(500).json({ success: false, message: 'Error creating flags', error: error.message });
    }
};

// Admin gets all flags
exports.getAllFlags = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT f.*,
                CASE
                    WHEN f.item_type = 'publication' THEN p.title
                    WHEN f.item_type = 'conference'  THEN c.title
                    WHEN f.item_type = 'book'        THEN b.title
                END as item_title,
                CASE
                    WHEN f.item_type = 'publication' THEN u1.name
                    WHEN f.item_type = 'conference'  THEN u2.name
                    WHEN f.item_type = 'book'        THEN u3.name
                END as faculty_name,
                CASE
                    WHEN f.item_type = 'publication' THEN u1.faculty_id
                    WHEN f.item_type = 'conference'  THEN u2.faculty_id
                    WHEN f.item_type = 'book'        THEN u3.faculty_id
                END as faculty_code
             FROM flags f
             LEFT JOIN publications   p  ON f.item_type = 'publication' AND f.item_id = p.id
             LEFT JOIN conferences    c  ON f.item_type = 'conference'  AND f.item_id = c.id
             LEFT JOIN books_chapters b  ON f.item_type = 'book'        AND f.item_id = b.id
             LEFT JOIN faculty_profile fp1 ON p.faculty_id = fp1.id
             LEFT JOIN users          u1  ON fp1.user_id  = u1.id
             LEFT JOIN faculty_profile fp2 ON c.faculty_id = fp2.id
             LEFT JOIN users          u2  ON fp2.user_id  = u2.id
             LEFT JOIN faculty_profile fp3 ON b.faculty_id = fp3.id
             LEFT JOIN users          u3  ON fp3.user_id  = u3.id
             ORDER BY f.flagged_at DESC`
        );
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Get all flags error:', error);
        res.status(500).json({ success: false, message: 'Error fetching flags', error: error.message });
    }
};

// Get flags for a specific item
exports.getFlagsByItem = async (req, res) => {
    try {
        const { itemType, itemId } = req.params;
        const result = await pool.query(
            `SELECT * FROM flags WHERE item_type = $1 AND item_id = $2 AND status != 'resolved' ORDER BY flagged_at DESC`,
            [itemType, itemId]
        );
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Get flags by item error:', error);
        res.status(500).json({ success: false, message: 'Error fetching flags', error: error.message });
    }
};

// Get active flags for a faculty member
exports.getFlagsByFaculty = async (req, res) => {
    try {
        const { facultyId } = req.params;

        // CHANGED: faculty_id string lives in users now, reach faculty_profile via join
        const facultyResult = await pool.query(
            `SELECT fp.id FROM faculty_profile fp
             JOIN users u ON fp.user_id = u.id
             WHERE u.faculty_id = $1`,
            [facultyId]
        );
        if (facultyResult.rows.length === 0)
            return res.status(404).json({ success: false, message: 'Faculty not found' });

        const fId = facultyResult.rows[0].id;

        const result = await pool.query(
            `SELECT f.*,
                CASE
                    WHEN f.item_type = 'publication' THEN p.title
                    WHEN f.item_type = 'conference'  THEN c.title
                    WHEN f.item_type = 'book'        THEN b.title
                END as item_title
             FROM flags f
             LEFT JOIN publications   p ON f.item_type = 'publication' AND f.item_id = p.id AND p.faculty_id = $1
             LEFT JOIN conferences    c ON f.item_type = 'conference'  AND f.item_id = c.id AND c.faculty_id = $1
             LEFT JOIN books_chapters b ON f.item_type = 'book'        AND f.item_id = b.id AND b.faculty_id = $1
             WHERE (
                 (f.item_type = 'publication' AND p.faculty_id = $1) OR
                 (f.item_type = 'conference'  AND c.faculty_id = $1) OR
                 (f.item_type = 'book'        AND b.faculty_id = $1)
             )
             AND f.status != 'resolved'
             ORDER BY f.flagged_at DESC`,
            [fId]
        );
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Get faculty flags error:', error);
        res.status(500).json({ success: false, message: 'Error fetching faculty flags', error: error.message });
    }
};

// Faculty marks a flag as resolved
exports.markResolved = async (req, res) => {
    try {
        const { flagId } = req.params;
        const { facultyNote } = req.body;
        const result = await pool.query(
            `UPDATE flags SET status = 'pending_review', faculty_note = $1, resolved_at = NOW()
             WHERE id = $2 RETURNING *`,
            [facultyNote || '', flagId]
        );
        if (result.rows.length === 0)
            return res.status(404).json({ success: false, message: 'Flag not found' });
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Mark resolved error:', error);
        res.status(500).json({ success: false, message: 'Error updating flag', error: error.message });
    }
};

// Admin approves the resolution
exports.approveResolution = async (req, res) => {
    try {
        const { flagId } = req.params;
        const { approvedBy } = req.body;
        const result = await pool.query(
            `UPDATE flags SET status = 'resolved', approved_at = NOW(), approved_by = $1
             WHERE id = $2 RETURNING *`,
            [approvedBy || 'Admin', flagId]
        );
        if (result.rows.length === 0)
            return res.status(404).json({ success: false, message: 'Flag not found' });
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Approve resolution error:', error);
        res.status(500).json({ success: false, message: 'Error approving flag', error: error.message });
    }
};

// Admin deletes a flag
exports.deleteFlag = async (req, res) => {
    try {
        const result = await pool.query(
            'DELETE FROM flags WHERE id = $1 RETURNING *', [req.params.flagId]
        );
        if (result.rows.length === 0)
            return res.status(404).json({ success: false, message: 'Flag not found' });
        res.json({ success: true, message: 'Flag deleted' });
    } catch (error) {
        console.error('Delete flag error:', error);
        res.status(500).json({ success: false, message: 'Error deleting flag', error: error.message });
    }
};

// Admin rejects resolution and re-flags
exports.reflagFlag = async (req, res) => {
    try {
        const { flagId } = req.params;
        const { reason } = req.body;
        if (!reason || !reason.trim())
            return res.status(400).json({ success: false, message: 'A new reason is required to re-flag' });

        const current = await pool.query('SELECT * FROM flags WHERE id = $1', [flagId]);
        if (current.rows.length === 0)
            return res.status(404).json({ success: false, message: 'Flag not found' });

        const old = current.rows[0];
        await pool.query(
            `INSERT INTO flag_history (flag_id, reason, faculty_note, reflagged_by)
             VALUES ($1, $2, $3, 'Admin')`,
            [flagId, old.reason, old.faculty_note || null]
        );

        const result = await pool.query(
            `UPDATE flags
             SET status = 'flagged',
                 reason = $1,
                 faculty_note = NULL,
                 resolved_at = NULL,
                 flagged_at = NOW(),
                 reflag_count = COALESCE(reflag_count, 0) + 1
             WHERE id = $2 RETURNING *`,
            [reason.trim(), flagId]
        );

        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Re-flag error:', error);
        res.status(500).json({ success: false, message: 'Error re-flagging', error: error.message });
    }
};

// Get ALL flags for a faculty member including resolved
exports.getFlagsByFacultyAll = async (req, res) => {
    try {
        const { facultyId } = req.params;

        // CHANGED: same pattern as getFlagsByFaculty
        const facultyResult = await pool.query(
            `SELECT fp.id FROM faculty_profile fp
             JOIN users u ON fp.user_id = u.id
             WHERE u.faculty_id = $1`,
            [facultyId]
        );
        if (facultyResult.rows.length === 0)
            return res.status(404).json({ success: false, message: 'Faculty not found' });

        const fId = facultyResult.rows[0].id;

        const result = await pool.query(
            `SELECT f.*,
                CASE
                    WHEN f.item_type = 'publication' THEN p.title
                    WHEN f.item_type = 'conference'  THEN c.title
                    WHEN f.item_type = 'book'        THEN b.title
                END as item_title
             FROM flags f
             LEFT JOIN publications   p ON f.item_type = 'publication' AND f.item_id = p.id AND p.faculty_id = $1
             LEFT JOIN conferences    c ON f.item_type = 'conference'  AND f.item_id = c.id AND c.faculty_id = $1
             LEFT JOIN books_chapters b ON f.item_type = 'book'        AND f.item_id = b.id AND b.faculty_id = $1
             WHERE (
                 (f.item_type = 'publication' AND p.faculty_id = $1) OR
                 (f.item_type = 'conference'  AND c.faculty_id = $1) OR
                 (f.item_type = 'book'        AND b.faculty_id = $1)
             )
             ORDER BY f.flagged_at DESC`,
            [fId]
        );

        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Get faculty flags history error:', error);
        res.status(500).json({ success: false, message: 'Error fetching flag history', error: error.message });
    }
};