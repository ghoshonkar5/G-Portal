const pool = require('../config/database');

// ── Format faculty user object ───────────────────────────────────
// Input: joined row from faculty_profile fp JOIN users u
const formatFacultyUser = (row) => ({
    id: row.user_id,
    facultyProfileId: row.faculty_profile_id,
    email: row.email,
    role: row.role,
    facultyId: row.faculty_id,
    name: row.name,
    department: row.department,
    designation: row.designation,
    mobile: row.mobile,
    researchArea: row.research_area,
    profileSetupComplete: row.profile_setup_complete,
    googleScholarUrl: row.google_scholar_url || null,
    scopusUrl: row.scopus_url || null,
    scopusUrl2: row.scopus_url_2 || null,
    scopusUrl3: row.scopus_url_3 || null,
    wosUrl: row.wos_url || null,
    wosUrl2: row.wos_url_2 || null,
    wosUrl3: row.wos_url_3 || null,
    officeRoom: row.office_room || null,
    officeHours: row.office_hours || null,
    coursesTaught: row.courses_taught || null,
    roles: row.roles || null,
    linkedinUrl: row.linkedin_url || null,
    websiteUrl: row.website_url || null,
    yearsOfExperience: row.years_of_experience || null,
    profilePhoto: row.profile_photo || null,
});

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT fp.*, fp.id AS faculty_profile_id, u.id AS user_id,
                    u.email, u.role, u.faculty_id, u.name, u.department, u.designation, u.mobile
             FROM faculty_profile fp
             JOIN users u ON fp.user_id = u.id
             WHERE u.id = $1`,
            [req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.json({ success: true, user: formatFacultyUser(result.rows[0]) });

    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ success: false, message: 'Error fetching user', error: error.message });
    }
};

// @desc    Update faculty extended profile
// @route   PUT /api/auth/profile
// @access  Private
exports.updateProfile = async (req, res) => {
    const client = await pool.connect();
    try {
        const {
            officeRoom, officeHours, coursesTaught, roles,
            linkedinUrl, websiteUrl, yearsOfExperience, profilePhoto,
            mobile, researchArea
        } = req.body;
        const userId = req.user.id;

        await client.query('BEGIN');

        const fpResult = await client.query(
            `UPDATE faculty_profile
             SET
               office_room         = COALESCE($1, office_room),
               office_hours        = COALESCE($2, office_hours),
               courses_taught      = COALESCE($3, courses_taught),
               roles               = COALESCE($4, roles),
               linkedin_url        = COALESCE($5, linkedin_url),
               website_url         = COALESCE($6, website_url),
               years_of_experience = COALESCE($7, years_of_experience),
               profile_photo       = COALESCE($8, profile_photo),
               research_area       = COALESCE($9, research_area),
               profile_setup_complete = true,
               updated_at          = NOW()
             WHERE user_id = $10
             RETURNING *`,
            [
                officeRoom || null, officeHours || null, coursesTaught || null,
                roles || null, linkedinUrl || null, websiteUrl || null,
                yearsOfExperience || null, profilePhoto || null, researchArea || null,
                userId
            ]
        );

        if (fpResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, message: 'Faculty not found' });
        }

        // mobile lives in users, not faculty_profile
        await client.query(
            'UPDATE users SET mobile = COALESCE($1, mobile), updated_at = NOW() WHERE id = $2',
            [mobile || null, userId]
        );

        await client.query('COMMIT');

        const updated = fpResult.rows[0];
        res.json({
            success: true,
            message: 'Profile updated successfully',
            user: {
                officeRoom: updated.office_room,
                officeHours: updated.office_hours,
                coursesTaught: updated.courses_taught,
                roles: updated.roles,
                linkedinUrl: updated.linkedin_url,
                websiteUrl: updated.website_url,
                yearsOfExperience: updated.years_of_experience,
                profilePhoto: updated.profile_photo,
                researchArea: updated.research_area,
                profileSetupComplete: updated.profile_setup_complete,
            }
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Update profile error:', error);
        res.status(500).json({ success: false, message: 'Error updating profile', error: error.message });
    } finally {
        client.release();
    }
};

// @desc    Update faculty academic profile URLs
// @route   PUT /api/auth/profile-urls
// @access  Private
exports.updateProfileUrls = async (req, res) => {
    try {
        const { googleScholarUrl, scopusUrl, scopusUrl2, scopusUrl3, wosUrl, wosUrl2, wosUrl3 } = req.body;


        const result = await pool.query(
            `UPDATE faculty_profile
 SET google_scholar_url = $1, scopus_url = $2, scopus_url_2 = $3,
     scopus_url_3 = $4, wos_url = $5, wos_url_2 = $6, wos_url_3 = $7,
     updated_at = NOW()
 WHERE user_id = $8`,
[googleScholarUrl || null, scopusUrl || null, scopusUrl2 || null,
 scopusUrl3 || null, wosUrl || null, wosUrl2 || null, wosUrl3 || null,
 req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Faculty not found' });
        }

        res.json({
            success: true,
            message: 'Profile URLs updated successfully',
            data: {
    googleScholarUrl: result.rows[0].google_scholar_url,
    scopusUrl:  result.rows[0].scopus_url,
    scopusUrl2: result.rows[0].scopus_url_2,
    scopusUrl3: result.rows[0].scopus_url_3,
    wosUrl:  result.rows[0].wos_url,
    wosUrl2: result.rows[0].wos_url_2,
    wosUrl3: result.rows[0].wos_url_3,
}
        });

    } catch (error) {
        console.error('Update profile URLs error:', error);
        res.status(500).json({ success: false, message: 'Error updating profile URLs', error: error.message });
    }
};

// @desc    Admin update any faculty profile
// @route   PUT /api/auth/admin/faculty/:id  (:id = faculty_profile.id)
// @access  Private (admin)
exports.adminUpdateFaculty = async (req, res) => {
    const client = await pool.connect();
    try {
        const facultyProfileId = req.params.id;
        const {
            name, designation, department, email, mobile,
            researchArea, officeRoom, officeHours, coursesTaught,
            roles, linkedinUrl, websiteUrl, yearsOfExperience
        } = req.body;

        await client.query('BEGIN');

        // Profile fields live in faculty_profile
        await client.query(
            `UPDATE faculty_profile SET
               research_area       = COALESCE($1, research_area),
               office_room         = COALESCE($2, office_room),
               office_hours        = COALESCE($3, office_hours),
               courses_taught      = COALESCE($4, courses_taught),
               roles               = COALESCE($5, roles),
               linkedin_url        = COALESCE($6, linkedin_url),
               website_url         = COALESCE($7, website_url),
               years_of_experience = COALESCE($8, years_of_experience),
               updated_at          = NOW()
             WHERE id = $9`,
            [
                researchArea || null, officeRoom || null, officeHours || null,
                coursesTaught || null, roles || null, linkedinUrl || null,
                websiteUrl || null, yearsOfExperience || null,
                facultyProfileId
            ]
        );

        // Basic info fields (name, designation, department, mobile, email) live in users
        await client.query(
            `UPDATE users SET
               name        = COALESCE($1, name),
               designation = COALESCE($2, designation),
               department  = COALESCE($3, department),
               mobile      = COALESCE($4, mobile),
               email       = COALESCE($5, email),
               updated_at  = NOW()
             WHERE id = (SELECT user_id FROM faculty_profile WHERE id = $6)`,
            [
                name || null, designation || null, department || null,
                mobile || null, email || null,
                facultyProfileId
            ]
        );

        await client.query('COMMIT');
        res.json({ success: true, message: 'Faculty updated successfully' });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Admin update faculty error:', error);
        res.status(500).json({ success: false, message: 'Error updating faculty', error: error.message });
    } finally {
        client.release();
    }
};

// @desc    Get all faculty with publication counts
// @route   GET /api/auth/faculty
// @access  Private
exports.getAllFaculty = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT fp.*, fp.id AS faculty_profile_id, u.id AS user_id,
                    u.email, u.role, u.faculty_id, u.name, u.department, u.designation, u.mobile,
                (SELECT COUNT(*) FROM publications p  WHERE p.faculty_id = fp.id) AS publications_count,
                (SELECT COUNT(*) FROM conferences c   WHERE c.faculty_id = fp.id) AS conferences_count,
                (SELECT COUNT(*) FROM books_chapters b WHERE b.faculty_id = fp.id) AS books_count
             FROM faculty_profile fp
             JOIN users u ON fp.user_id = u.id
             WHERE u.role = 'faculty'
             ORDER BY u.name ASC`
        );

        const faculty = result.rows.map(f => ({
            ...formatFacultyUser(f),
            publicationsCount: parseInt(f.publications_count) || 0,
            conferencesCount:  parseInt(f.conferences_count)  || 0,
            booksCount:        parseInt(f.books_count)        || 0,
        }));

        res.json({ success: true, count: faculty.length, data: faculty });

    } catch (error) {
        console.error('Get all faculty error:', error);
        res.status(500).json({ success: false, message: 'Error fetching faculty', error: error.message });
    }
};

// @desc    Soft-delete (deactivate) a faculty account
// @route   PATCH /api/auth/admin/faculty/:id/deactivate
// @access  Private (admin only)
exports.deactivateFaculty = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Admin access required' });
        }
        const { id } = req.params; // faculty_profile.id
        const result = await pool.query(
            `UPDATE users SET is_active = false, token_version = token_version + 1
             WHERE id = (SELECT user_id FROM faculty_profile WHERE id = $1)
             RETURNING id`,
            [id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Faculty not found' });
        }
        res.json({ success: true, message: 'Faculty account deactivated' });
    } catch (error) {
        console.error('Deactivate faculty error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};