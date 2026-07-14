const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/authMiddleware');
const ctrl = require('../controllers/potentialFlagController');

// ── Faculty routes — /history must come BEFORE /:id routes ──
router.get('/faculty/:facultyId',             protect, ctrl.getByFaculty);
router.get('/faculty/:facultyId/history',     protect, ctrl.getByFacultyAll);   // ← new

router.get('/all',                            protect, adminOnly, ctrl.getAll);
router.put('/:id/resolve',                    protect, ctrl.resolve);
router.post('/:id/escalate',                  protect, adminOnly, ctrl.escalate);

module.exports = router;