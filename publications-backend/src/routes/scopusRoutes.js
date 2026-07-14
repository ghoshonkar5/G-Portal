const express = require('express');
const router = express.Router();
const {
  previewScopus,
  importScopus,
  syncScopus,
  syncAll,
  getMetrics,
  getLastSynced,
  getYearlyStats,
  backfillConferenceCitations, 
} = require('../controllers/scopusController');
const { protect } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(protect);

// Preview publications (no save)
router.get('/preview/:facultyId', previewScopus);

// Import selected publications
router.post('/import/:facultyId', importScopus);

// Quick sync: auto-import all for a faculty
router.post('/sync/:facultyId', syncScopus);

// Admin: trigger nightly sync for all faculty
router.post('/sync-all', syncAll);

router.post('/backfill-conference-citations', backfillConferenceCitations);

// Scopus author-level metrics (citations, h-index, doc count)
router.get('/metrics/:facultyId', getMetrics);

// Last synced timestamp
router.get('/last-synced/:facultyId', getLastSynced);

// Yearly stats for chart
router.get('/yearly-stats/:facultyId', getYearlyStats);


module.exports = router;