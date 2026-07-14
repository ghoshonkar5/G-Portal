const express = require('express');
const router = express.Router();
const {
    getAllBooks,
    getBooksByFaculty,
    createBook,
    updateBook,
    deleteBook,
    exportBooksCSV
} = require('../controllers/bookController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/export/csv', exportBooksCSV);
router.get('/', getAllBooks);
router.get('/faculty/:facultyId', getBooksByFaculty);
router.post('/', createBook);
router.put('/:id', updateBook);
router.delete('/:id', deleteBook);

module.exports = router;