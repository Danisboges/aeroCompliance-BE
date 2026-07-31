const express = require('express');
const router = express.Router();
const approvalController = require('../controllers/approvalController');
const { verifyToken, requireRole, Role } = require('../middleware/authMiddleware');

const { uploadSignature, uploadSingleSignature } = require('../middleware/uploadMiddleware');

// GET /api/approvals/inbox (Get assigned approvals for current user)
router.get('/inbox', verifyToken, approvalController.getInbox);

// GET /api/approvals/my-submissions (Get approvals submitted by current user)
router.get('/my-submissions', verifyToken, approvalController.getMySubmissions);

// GET /api/approvals/history (Get review history of current user)
router.get('/history', verifyToken, approvalController.getHistory);

// GET /api/approvals/pending-second-engineer (Dedicated Endpoint) - DEPRECATED
router.get('/pending-second-engineer', verifyToken, requireRole([Role.ENGINEER, Role.ADMIN]), approvalController.getPendingSecondEngineer);

// GET /api/approvals/pending-manager (Dedicated Endpoint) - DEPRECATED
router.get('/pending-manager', verifyToken, requireRole([Role.MANAGER, Role.ADMIN]), approvalController.getPendingManager);

// GET /api/approvals (Get All Approvals - Admin / General purpose)
router.get('/', verifyToken, requireRole([Role.ADMIN]), approvalController.getApprovals);

// GET /api/approvals/:eesId (Get single approval detail)
router.get('/:eesId', verifyToken, approvalController.getApprovalByEesId);

// POST /api/approvals/:eesId/submit (Engineer/Creator submitting for approval)
router.post('/:eesId/submit', verifyToken, requireRole([Role.ENGINEER, Role.MANAGER, Role.ADMIN]), uploadSingleSignature, approvalController.submitForApproval);

// POST /api/approvals/:eesId/resubmit (Maker resubmitting a rejected/returned EES)
router.post('/:eesId/resubmit', verifyToken, requireRole([Role.ENGINEER, Role.MANAGER, Role.ADMIN]), uploadSingleSignature, approvalController.resubmitForApproval);

// POST /api/approvals/:eesId/review (Engineer/Manager reviewing)
router.post('/:eesId/review', verifyToken, requireRole([Role.ENGINEER, Role.MANAGER, Role.ADMIN]), uploadSignature.single('signature'), approvalController.postReview);

// POST /api/approvals/:eesId/reject (Dedicated Reject Endpoint)
router.post('/:eesId/reject', verifyToken, requireRole([Role.ENGINEER, Role.MANAGER, Role.ADMIN]), approvalController.rejectApproval);

module.exports = router;
