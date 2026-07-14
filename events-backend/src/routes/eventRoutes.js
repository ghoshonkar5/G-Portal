const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const { verifyRole } = require('../middleware/roleMiddleware');
const upload = require('../middleware/uploadMiddleware');
const {
  getMine,
  createEvent,
  updateEvent,
  deleteEvent,
  bulkImport,
  setBatchDeadline,
  setSingleDeadline,
  mineExport,
  getAll,
  adminExport
} = require('../controllers/eventController');

// Faculty routes
router.get('/mine',          verifyToken, verifyRole('faculty'), getMine);
router.get('/mine/export',   verifyToken, verifyRole('faculty'), mineExport);
router.post('/',             verifyToken, verifyRole('faculty'), upload.fields([{ name: 'certificates', maxCount: 5 }, { name: 'photos', maxCount: 10 }]), createEvent);
router.put('/:id/deadline',  verifyToken, verifyRole('faculty'), setSingleDeadline);
router.put('/:id',           verifyToken, verifyRole('faculty'), upload.fields([{ name: 'certificates', maxCount: 5 }, { name: 'photos', maxCount: 10 }]), updateEvent);
router.delete('/:id',        verifyToken, verifyRole('faculty'), deleteEvent);
router.post('/bulk-import',  verifyToken, verifyRole('faculty'), upload.single('file'), bulkImport);
router.put('/batch/:batchId/deadline', verifyToken, verifyRole('faculty'), setBatchDeadline);

// Admin routes
router.get('/all',    verifyToken, verifyRole('admin'), getAll);
router.get('/export', verifyToken, verifyRole('admin'), adminExport);

module.exports = router;