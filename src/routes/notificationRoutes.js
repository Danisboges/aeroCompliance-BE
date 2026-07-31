const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { verifyToken } = require('../middleware/authMiddleware');

// GET /api/notifications
router.get('/', verifyToken, notificationController.getNotifications);

// PATCH /api/notifications/read-all
router.patch('/read-all', verifyToken, notificationController.markAllAsRead);

// PATCH /api/notifications/:id/read
router.patch('/:id/read', verifyToken, notificationController.markAsRead);

module.exports = router;
