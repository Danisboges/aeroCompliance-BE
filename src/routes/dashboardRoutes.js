const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { verifyToken } = require('../middleware/authMiddleware');

// GET /api/dashboard/engineering-review/summary
router.get('/engineering-review/summary', verifyToken, dashboardController.getSummary);

module.exports = router;
