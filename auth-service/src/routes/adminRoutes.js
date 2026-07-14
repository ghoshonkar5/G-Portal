const express = require('express');
const router = express.Router();
const { protect, requireAdmin } = require('../middleware/authMiddleware');
const adminController = require('../controllers/adminController');

router.use(protect);       // All admin routes require JWT
router.use(requireAdmin);  // All admin routes require role === 'admin'

router.post('/users', adminController.createUser);
router.post('/users/bulk', adminController.bulkCreateUsers);
router.get('/users', adminController.listUsers);
router.patch('/users/:id/status', adminController.toggleUserStatus);
router.delete('/users/:id', adminController.deleteUser);

module.exports = router;
