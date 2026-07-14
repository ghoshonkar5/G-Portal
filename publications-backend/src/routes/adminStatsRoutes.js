const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
    getTimeseries,
    getQuartileDistribution,
    getDeptDistribution,
    getTopContributors,
    getOverviewCounts,
} = require('../controllers/adminStatsController');

// All routes require authentication
router.use(protect);

router.get('/timeseries',            getTimeseries);
router.get('/quartile-distribution', getQuartileDistribution);
router.get('/by-department',         getDeptDistribution);
router.get('/top-contributors',      getTopContributors);
router.get('/overview-counts',       getOverviewCounts);

module.exports = router;
