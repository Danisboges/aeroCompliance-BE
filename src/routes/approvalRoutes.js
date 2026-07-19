const express = require('express');
const router = express.Router();
const approvalController = require('../controllers/approvalController');
const { verifyToken, requireRole, Role } = require('../middleware/authMiddleware');

// GET /api/approvals (First/Second Engineer or Admin)
router.get('/', verifyToken, requireRole([Role.FIRST_ENGINEER, Role.SECOND_ENGINEER, Role.ADMIN]), approvalController.getApprovals);

// POST /api/approvals/:eesId/review (Second Engineer for final review, or Admin)
router.post('/:eesId/review', verifyToken, requireRole([Role.SECOND_ENGINEER, Role.ADMIN]), approvalController.postReview);

module.exports = router;
