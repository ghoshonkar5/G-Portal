const pool = require('../config/database');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { generateToken, formatUser } = require('../utils/jwtUtils');

// ── Allowed values ────────────────────────────────────────
const ALLOWED_DEPARTMENTS = [
    'Computer Science and Engineering',
    'Electronics and Communication Engineering',
    'Mechanical Engineering',
    'Civil Engineering',
    'Electrical Engineering',
    'Information Technology',
    'Chemical Engineering',
    'Biotechnology',
    'Mathematics',
    'Physics',
    'Chemistry',
    'Management Studies',
    'Other'
];

const ALLOWED_DESIGNATIONS = [
    'Assistant Professor',
    'Associate Professor',
    'Professor',
    'Senior Professor',
    'Professor Emeritus',
    'Visiting Faculty',
    'Adjunct Faculty'
];

// ── Multer setup ──────────────────────────────────────────
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../../uploads');
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `profile_${req.user.id}_${Date.now()}${ext}`);
    }
});

const fileFilter = (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only JPEG, PNG, or WebP images are allowed'), false);
};

exports.upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB — frontend compresses to ~150KB before sending
    fileFilter
});

// ── Helper: parse TagInput field ──────────────────────────
const parseTagField = (value, fieldName) => {
    if (!value || (typeof value !== 'string' && !Array.isArray(value))) {
        return { str: null, error: `${fieldName} must have at least one entry` };
    }

    let arr = [];
    if (Array.isArray(value)) {
        arr = value;
    } else if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
            try {
                const parsed = JSON.parse(trimmed);
                if (Array.isArray(parsed)) {
                    arr = parsed;
                }
            } catch {
                arr = trimmed.split(',');
            }
        } else {
            arr = trimmed.split(',');
        }
    }

    arr = arr.map(item => String(item).trim()).filter(Boolean);

    if (arr.length === 0) {
        return { str: null, error: `${fieldName} must have at least one entry` };
    }

    return { str: arr.join(', '), error: null };
};

// @desc    Submit onboarding form
// @route   PUT /api/profile/onboarding
// @access  Private
exports.onboarding = async (req, res) => {
    const client = await pool.connect();
    try {
        const userId = req.user.id;

        const {
            department,
            designation,
            mobile,
            office_room,
            years_of_experience,
            research_area,
            courses_taught,
            roles,
            google_scholar_url,
            scopus_url,
            scopus_url_2,
            scopus_url_3,
            wos_url,
            wos_url_2,
            wos_url_3,
            profile_photo
        } = req.body;

        // ── Tier 1 presence check ─────────────────────────
        if (!department || !designation || !mobile || !office_room ||
            years_of_experience === undefined || years_of_experience === null || years_of_experience === '' ||
            !research_area || !courses_taught || !roles) {
            return res.status(400).json({
                success: false,
                message: 'All mandatory fields are required: department, designation, mobile, office_room, years_of_experience, research_area, courses_taught, roles'
            });
        }

        if (!profile_photo) {
            return res.status(400).json({ success: false, message: 'Profile photo is required' });
        }

        // ── Validate dropdown values ──────────────────────
        if (!ALLOWED_DEPARTMENTS.includes(department)) {
            return res.status(400).json({ success: false, message: 'Invalid department value' });
        }

        if (!ALLOWED_DESIGNATIONS.includes(designation)) {
            return res.status(400).json({ success: false, message: 'Invalid designation value' });
        }

        // ── Validate mobile ───────────────────────────────
        const mobileRegex = /^[6-9]\d{9}$/;
        if (!mobileRegex.test(mobile)) {
            return res.status(400).json({ success: false, message: 'Invalid mobile number. Must be a 10-digit Indian mobile number.' });
        }

        // ── Validate years of experience ──────────────────
        const yearsNum = parseInt(years_of_experience, 10);
        if (isNaN(yearsNum) || yearsNum < 0 || yearsNum > 50) {
            return res.status(400).json({ success: false, message: 'Years of experience must be between 0 and 50' });
        }

        // ── Parse TagInput arrays ─────────────────────────
        const { str: researchStr, error: e1 } = parseTagField(research_area, 'Research Areas');
        if (e1) return res.status(400).json({ success: false, message: e1 });

        const { str: coursesStr, error: e2 } = parseTagField(courses_taught, 'Courses Taught');
        if (e2) return res.status(400).json({ success: false, message: e2 });

        const { str: rolesStr, error: e3 } = parseTagField(roles, 'Roles & Responsibilities');
        if (e3) return res.status(400).json({ success: false, message: e3 });

        // ── Photo path ────────────────────────────────────
        const photoPath = profile_photo;

        // ── DB updates in one transaction ─────────────────
        await client.query('BEGIN');

        await client.query(
            `UPDATE users SET
                department = $1,
                designation = $2,
                mobile = $3,
                profile_completed = true,
                updated_at = NOW()
             WHERE id = $4`,
            [department, designation, mobile, userId]
        );

        await client.query(
            `UPDATE faculty_profile SET
                research_area = $1,
                courses_taught = $2,
                roles = $3,
                office_room = $4,
                years_of_experience = $5,
                profile_photo = $6,
                google_scholar_url = $7,
                scopus_url = $8,
                scopus_url_2 = $9,
                scopus_url_3 = $10,
                wos_url = $11,
                wos_url_2 = $12,
                wos_url_3 = $13,
                profile_setup_complete = true,
                updated_at = NOW()
             WHERE user_id = $14`,
            [
                researchStr,
                coursesStr,
                rolesStr,
                office_room,
                yearsNum,
                photoPath,
                google_scholar_url || null,
                scopus_url || null,
                scopus_url_2 || null,
                scopus_url_3 || null,
                wos_url || null,
                wos_url_2 || null,
                wos_url_3 || null,
                userId
            ]
        );

        await client.query('COMMIT');

        // ── Issue new token with profileCompleted: true ───
        const userResult = await pool.query(
            `SELECT u.*, fp.id AS faculty_profile_id
             FROM users u
             JOIN faculty_profile fp ON fp.user_id = u.id
             WHERE u.id = $1`,
            [userId]
        );

        const updatedUser = userResult.rows[0];
        const token = generateToken(updatedUser);

        res.json({
            success: true,
            message: 'Onboarding complete',
            token,
            user: formatUser(updatedUser)
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Onboarding error:', error);
        res.status(500).json({ success: false, message: 'Onboarding failed', error: error.message });
    } finally {
        client.release();
    }
};
exports.updateProfileUrls = async (req, res) => {
    try {
        const userId = req.user.id;
        const {
            googleScholarUrl, scopusUrl, scopusUrl2, scopusUrl3,
            wosUrl, wosUrl2, wosUrl3
        } = req.body;

        await pool.query(
            `UPDATE faculty_profile SET
                google_scholar_url = $1,
                scopus_url         = $2,
                scopus_url_2       = $3,
                scopus_url_3       = $4,
                wos_url            = $5,
                wos_url_2          = $6,
                wos_url_3          = $7,
                updated_at         = NOW()
             WHERE user_id = $8`,
            [
                googleScholarUrl || null,
                scopusUrl        || null,
                scopusUrl2       || null,
                scopusUrl3       || null,
                wosUrl           || null,
                wosUrl2          || null,
                wosUrl3          || null,
                userId
            ]
        );

        const result = await pool.query(
            `SELECT u.*, fp.id AS faculty_profile_id,
                    fp.google_scholar_url, fp.scopus_url, fp.scopus_url_2, fp.scopus_url_3,
                    fp.wos_url, fp.wos_url_2, fp.wos_url_3,
                    fp.research_area, fp.courses_taught, fp.roles,
                    fp.office_room, fp.years_of_experience, fp.profile_photo
             FROM users u
             JOIN faculty_profile fp ON fp.user_id = u.id
             WHERE u.id = $1`,
            [userId]
        );

        const updatedUser = result.rows[0];
        res.json({ success: true, message: 'Profile URLs updated', user: formatUser(updatedUser) });
    } catch (error) {
        console.error('Update profile URLs error:', error);
        res.status(500).json({ success: false, message: 'Failed to update URLs', error: error.message });
    }
};
