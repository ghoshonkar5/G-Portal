const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const { verifyRole } = require('../middleware/roleMiddleware');
const { listFaculty, createFaculty, updateProfile, changePassword, getMe } = require('../controllers/facultyController');

router.get('/', verifyToken, verifyRole('admin'), listFaculty);
router.post('/', verifyToken, verifyRole('admin'), createFaculty);
router.get('/me', verifyToken, getMe);
router.put('/me', verifyToken, verifyRole('faculty'), updateProfile);
router.put('/me/password', verifyToken, verifyRole('faculty'), changePassword);

module.exports = router;