const express = require('express');
const router  = express.Router();
const {
  previewWos,
  importWos,
  syncWos,
  syncAll,
  getMetrics,
  getLastSynced,
  getYearlyStats,
} = require('../controllers/wosController');
const { protect } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(protect);

// Preview publications (no save)
router.get('/preview/:facultyId', previewWos);

// Import selected publications
router.post('/import/:facultyId', importWos);

// Quick sync: auto-import all for a faculty
router.post('/sync/:facultyId', syncWos);

// Admin: trigger nightly sync for all faculty
router.post('/sync-all', syncAll);

// WoS author-level metrics (citations, h-index, doc count)
router.get('/metrics/:facultyId', getMetrics);

// Last synced timestamp
router.get('/last-synced/:facultyId', getLastSynced);

// Yearly stats for chart
router.get('/yearly-stats/:facultyId', getYearlyStats);

module.exports = router;