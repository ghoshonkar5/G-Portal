const express = require('express');
const router = express.Router();
const {
    getAllPublications,
    getPublicationsByFaculty,
    getPublicationById,
    createPublication,
    updatePublication,
    deletePublication,
    getPublicationStats,
    exportPublicationsCSV,   // ← NEW
} = require('../controllers/publicationController');
const { protect } = require('../middleware/authMiddleware');

// All routes are protected (require authentication)
router.use(protect);

// Routes
router.get('/', getAllPublications);
router.get('/export/csv', exportPublicationsCSV);        // ← NEW — must be before /:id
router.get('/faculty/:facultyId', getPublicationsByFaculty);
router.get('/stats/:facultyId', getPublicationStats);
router.get('/:id', getPublicationById);
router.post('/', createPublication);
router.put('/:id', updatePublication);
router.delete('/:id', deletePublication);

module.exports = router;