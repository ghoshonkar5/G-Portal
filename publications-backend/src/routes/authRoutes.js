const express = require('express');
const router = express.Router();
const { getMe, updateProfile, updateProfileUrls, getAllFaculty, adminUpdateFaculty, deactivateFaculty } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// login and register removed — now handled by Auth Service (port 5003)

router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.put('/profile-urls', protect, updateProfileUrls);
router.get('/faculty', protect, getAllFaculty);
router.put('/admin/faculty/:id', protect, adminUpdateFaculty);
router.patch('/admin/faculty/:id/deactivate', protect, deactivateFaculty);

// faculty-list: fixed — faculty table renamed to users in G-Learn
router.get('/faculty-list', protect, async (req, res) => {
    const pool = require('../config/database');
    try {
        const result = await pool.query(
            "SELECT faculty_id, name FROM users WHERE role = 'faculty' ORDER BY name ASC"
        );
        res.json({ success: true, data: result.rows });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching faculty list' });
    }
});

module.exports = router;