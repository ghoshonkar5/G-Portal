const express = require('express');
const router = express.Router();
const { previewScholar, importScholar, importCSV } = require('../controllers/scholarController');
const { getScholarMetrics } = require('../controllers/scholarMetricsController');
const { protect } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(protect);

// GET  /api/scholar/preview/:facultyId  — fetch & parse Scholar profile live (publications)
router.get('/preview/:facultyId', previewScholar);

// GET  /api/scholar/metrics/:facultyId  — fetch 6 Scholar metrics + yearly citations chart data
router.get('/metrics/:facultyId', getScholarMetrics);

// POST /api/scholar/import/:facultyId   — save selected Scholar publications to DB
router.post('/import/:facultyId', importScholar);

// POST /api/scholar/import-csv/:facultyId — import from uploaded Scopus/Scholar CSV
router.post('/import-csv/:facultyId', importCSV);

module.exports = router;