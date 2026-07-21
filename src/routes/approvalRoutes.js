const express = require('express');
const router = express.Router();
const approvalController = require('../controllers/approvalController');
const { verifyToken, requireRole, Role } = require('../middleware/authMiddleware');

const { uploadSignature } = require('../middleware/uploadMiddleware');

// GET /api/approvals (Engineer or Manager or Admin)
router.get('/', verifyToken, requireRole([Role.ENGINEER, Role.MANAGER, Role.ADMIN]), approvalController.getApprovals);

// GET /api/approvals/:eesId (Engineer or Manager or Admin)
router.get('/:eesId', verifyToken, requireRole([Role.ENGINEER, Role.MANAGER, Role.ADMIN]), approvalController.getApprovalByEesId);

// POST /api/approvals/:eesId/submit (Engineer/Creator submitting for approval)
router.post('/:eesId/submit', verifyToken, requireRole([Role.ENGINEER, Role.MANAGER, Role.ADMIN]), approvalController.submitForApproval);

// POST /api/approvals/:eesId/review (Engineer/Manager reviewing)
router.post('/:eesId/review', verifyToken, requireRole([Role.ENGINEER, Role.MANAGER, Role.ADMIN]), uploadSignature.single('signature'), approvalController.postReview);

module.exports = router;
