const express = require('express');
const router = express.Router();
const { analyzeTrends } = require('../controllers/aiController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

router.post('/trends', protect, adminOnly, analyzeTrends);

module.exports = router;
