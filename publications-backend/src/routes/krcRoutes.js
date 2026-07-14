const express = require('express');
const router = express.Router();
const multer = require('multer');
const { protect, adminOnly } = require('../middleware/authMiddleware');

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
    fileFilter: (_req, file, cb) => {
        const ok = /\.(csv|xlsx|xls)$/i.test(file.originalname);
        cb(null, ok);
    },
});

const ctrl = require('../controllers/krcController');

router.post('/import-csv', protect, adminOnly, upload.single('csv'), ctrl.importKRCCSV);
router.delete('/clear',    protect, adminOnly,                        ctrl.clearKRC);
router.get('/stats',       protect,                                   ctrl.getKRCStats);
router.get('/faculty/:id', protect,                                   ctrl.getKRCForFaculty);

module.exports = router;