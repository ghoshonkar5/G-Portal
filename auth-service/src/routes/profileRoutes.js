const express = require('express');
const router = express.Router();
const { onboarding, updateProfileUrls, upload } = require('../controllers/profileController');
const { protect } = require('../middleware/authMiddleware');

router.put('/onboarding', protect, onboarding);
router.put('/urls', protect, updateProfileUrls);

module.exports = router;