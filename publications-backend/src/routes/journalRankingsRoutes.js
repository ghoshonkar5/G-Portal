const express = require('express');
const router = express.Router();
const multer = require('multer');
const { protect, adminOnly } = require('../middleware/authMiddleware');

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB — Scimago CSV is ~10-15MB
});

const ctrl = (fn) => (req, res) =>
    require('../controllers/journalRankingsController')[fn](req, res);

router.post('/import-csv', protect, adminOnly, upload.single('csv'), ctrl('importScimagoCSV'));
router.get('/stats', protect, ctrl('getStats'));
router.post('/backfill-quartiles', protect, adminOnly, ctrl('backfillQuartiles'));
router.delete('/year/:year', protect, adminOnly, ctrl('deleteByYear'));
router.delete('/all', protect, adminOnly, ctrl('deleteAll'));

module.exports = router;