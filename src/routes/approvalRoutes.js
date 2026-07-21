const express = require('express');
const router = express.Router();
const approvalController = require('../controllers/approvalController');
const { verifyToken, requireRole, Role } = require('../middleware/authMiddleware');

const { uploadSignature } = require('../middleware/uploadMiddleware');

// GET /api/approvals (Get All Approvals - Admin / General purpose)
router.get('/', verifyToken, approvalController.getApprovals);

// GET /api/approvals/pending-second-engineer (Dedicated Endpoint)
router.get('/pending-second-engineer', verifyToken, requireRole([Role.SECOND_ENGINEER, Role.ADMIN]), approvalController.getPendingSecondEngineer);

// GET /api/approvals/pending-manager (Dedicated Endpoint)
router.get('/pending-manager', verifyToken, requireRole([Role.MANAGER, Role.ADMIN]), approvalController.getPendingManager);

// GET /api/approvals/:eesId (Get single approval detail)
router.get('/:eesId', verifyToken, approvalController.getApprovalByEesId);

// POST /api/approvals/:eesId/submit (Engineer/Creator submitting for approval)
router.post('/:eesId/submit', verifyToken, requireRole([Role.ENGINEER, Role.MANAGER, Role.ADMIN]), approvalController.submitForApproval);

// POST /api/approvals/:eesId/review (Engineer/Manager reviewing)
router.post('/:eesId/review', verifyToken, requireRole([Role.ENGINEER, Role.MANAGER, Role.ADMIN]), uploadSignature.single('signature'), approvalController.postReview);

module.exports = router;
