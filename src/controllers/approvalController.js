const approvalService = require('../services/approvalService');

/**
 * GET /api/approvals
 */
const getApprovals = async (req, res) => {
  try {
    const { status, assigneeId, page = 1, limit = 20 } = req.query;
    
    const operatorId = req.user?.operatorId;

    const p = parseInt(page, 10);
    const l = parseInt(limit, 10);
    const validPage = isNaN(p) ? 1 : Math.max(1, p);
    const validLimit = isNaN(l) ? 20 : Math.min(100, Math.max(1, l));

    const skip = (validPage - 1) * validLimit;
    const take = validLimit;

    const result = await approvalService.listApprovals({
      status,
      assigneeId,
      operatorId,
      skip,
      take
    });

    return res.status(200).json({
      data: result.data,
      total: result.total,
      page: validPage,
      limit: take
    });
  } catch (error) {
    console.error('[ApprovalController]', error);
    if (error.message.startsWith('Validation Error')) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * GET /api/approvals/inbox
 */
const getInbox = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, status, sort } = req.query;
    const user = req.user;

    const p = parseInt(page, 10);
    const l = parseInt(limit, 10);
    const validPage = isNaN(p) ? 1 : Math.max(1, p);
    const validLimit = isNaN(l) ? 20 : Math.min(100, Math.max(1, l));
    const skip = (validPage - 1) * validLimit;
    const take = validLimit;

    const result = await approvalService.getInbox(user, { skip, take, search, status, sort });

    return res.status(200).json({
      data: result.data,
      meta: {
        page: validPage,
        limit: take,
        total: result.total,
        pendingCount: result.pendingCount,
        totalPages: Math.ceil(result.total / take) || 1
      }
    });
  } catch (error) {
    console.error('[ApprovalController - Inbox]', error);
    if (error.message.startsWith('Validation Error')) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * GET /api/approvals/my-submissions
 */
const getMySubmissions = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const user = req.user;

    const p = parseInt(page, 10);
    const l = parseInt(limit, 10);
    const validPage = isNaN(p) ? 1 : Math.max(1, p);
    const validLimit = isNaN(l) ? 20 : Math.min(100, Math.max(1, l));
    const skip = (validPage - 1) * validLimit;
    const take = validLimit;

    const result = await approvalService.getMySubmissions(user, { skip, take });

    return res.status(200).json({
      data: result.data,
      meta: {
        page: validPage,
        limit: take,
        total: result.total,
        totalPages: Math.ceil(result.total / take) || 1
      }
    });
  } catch (error) {
    console.error('[ApprovalController - My Submissions]', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * GET /api/approvals/history
 */
const getHistory = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const user = req.user;

    const p = parseInt(page, 10);
    const l = parseInt(limit, 10);
    const validPage = isNaN(p) ? 1 : Math.max(1, p);
    const validLimit = isNaN(l) ? 20 : Math.min(100, Math.max(1, l));
    const skip = (validPage - 1) * validLimit;
    const take = validLimit;

    const result = await approvalService.getHistory(user, { skip, take });

    return res.status(200).json({
      data: result.data,
      meta: {
        page: validPage,
        limit: take,
        total: result.total,
        totalPages: Math.ceil(result.total / take) || 1
      }
    });
  } catch (error) {
    console.error('[ApprovalController - History]', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * GET /api/approvals/:eesId
 */
const getApprovalByEesId = async (req, res) => {
  try {
    const { eesId } = req.params;
    const user = req.user;

    const result = await approvalService.getApprovalByEesId(eesId, user);

    return res.status(200).json({
      data: result
    });
  } catch (error) {
    console.error('[ApprovalController]', error);
    if (error.message.includes('not found') || error.message.includes('No active approval')) {
      return res.status(404).json({ error: 'Data tidak ada' });
    }
    if (error.message.includes('Unauthorized') || error.message.includes('Forbidden')) {
      return res.status(403).json({ error: error.message });
    }
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * POST /api/approvals/:eesId/review
 */
const postReview = async (req, res) => {
  try {
    const { eesId } = req.params;
    const { action, comment, nextAssignedToId } = req.body;
    const user = req.user;

    if (!action) {
      return res.status(400).json({ error: 'Action is required (APPROVED, REJECTED, RETURNED)' });
    }

    const result = await approvalService.submitReview({
      eesId,
      action,
      comment,
      nextAssignedToId,
      user,
      signatureFile: req.file
    });

    return res.status(200).json({
      message: `Review submitted successfully: ${action}`,
      data: result
    });
  } catch (error) {
    console.error('[ApprovalController]', error);
    if (error.message.includes('found')) {
      return res.status(404).json({ error: 'Data tidak ada' });
    }
    if (error.message.includes('Invalid') || error.message.includes('not assigned') || error.message.startsWith('Validation Error')) {
      return res.status(400).json({ error: error.message });
    }
    if (error.message.startsWith('Conflict')) {
      return res.status(409).json({ error: error.message });
    }
    if (error.message.includes('Forbidden') || error.message.includes('Unauthorized')) {
      return res.status(403).json({ error: error.message });
    }
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * POST /api/approvals/:eesId/reject
 */
const rejectApproval = async (req, res) => {
  try {
    const { eesId } = req.params;
    const { comment } = req.body;
    const user = req.user;

    if (!comment) {
      return res.status(400).json({ error: 'Comment is required when rejecting an EES' });
    }

    const result = await approvalService.submitReview({
      eesId,
      action: 'REJECTED',
      comment,
      nextAssignedToId: null,
      user,
      signatureFile: null
    });

    return res.status(200).json({
      message: 'EES has been rejected successfully',
      data: result
    });
  } catch (error) {
    console.error('[ApprovalController - Reject]', error);
    if (error.message.includes('found')) {
      return res.status(404).json({ error: 'Data tidak ada' });
    }
    if (error.message.includes('Invalid') || error.message.includes('no longer pending') || error.message.startsWith('Validation Error')) {
      return res.status(400).json({ error: error.message });
    }
    if (error.message.includes('Forbidden') || error.message.includes('Unauthorized')) {
      return res.status(403).json({ error: error.message });
    }
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * POST /api/approvals/:eesId/submit
 */
const submitForApproval = async (req, res) => {
  try {
    const { eesId } = req.params;
    const { assignedToId } = req.body;

    const result = await approvalService.submitForApproval({
      eesId,
      assignedToId,
      submitterId: req.user.id,
      submitterRole: req.user.role,
      signatureFile: req.file,
    });

    return res.status(200).json({
      message: 'Approval process initiated successfully',
      data: result
    });
  } catch (error) {
    console.error('[ApprovalController]', error);
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Approval process already initiated for this EES' });
    }
    if (error.message.includes('found')) {
      return res.status(404).json({ error: 'Data tidak ada' });
    }
    if (error.message.startsWith('Validation Error')) {
      return res.status(400).json({ error: error.message });
    }
    if (error.message.includes('already')) {
      return res.status(409).json({ error: error.message });
    }
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * POST /api/approvals/:eesId/resubmit
 */
const resubmitForApproval = async (req, res) => {
  try {
    const { eesId } = req.params;
    const { assignedToId } = req.body;
    const submitterId = req.user.id;

    const result = await approvalService.resubmitForApproval({
      eesId,
      assignedToId,
      submitterId,
      submitterRole: req.user.role,
      signatureFile: req.file,
    });

    return res.status(200).json({
      message: 'Approval resubmitted successfully',
      data: result
    });
  } catch (error) {
    console.error('[ApprovalController - Resubmit]', error);
    if (error.message.includes('found')) {
      return res.status(404).json({ error: error.message });
    }
    if (error.message.includes('Forbidden') || error.message.includes('not authorized') || error.message.includes('Unauthorized')) {
      return res.status(403).json({ error: error.message });
    }
    if (error.message.startsWith('Validation Error') || error.message.includes('Invalid')) {
      return res.status(400).json({ error: error.message });
    }
    if (error.message.includes('already') || error.message.includes('cannot be resubmitted') || error.message.startsWith('Conflict')) {
      return res.status(409).json({ error: error.message }); // Conflict
    }
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * GET /api/approvals/pending-second-engineer (DEPRECATED)
 */
const getPendingSecondEngineer = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const operatorId = req.user?.operatorId;

    const p = parseInt(page, 10);
    const l = parseInt(limit, 10);
    const validPage = isNaN(p) ? 1 : Math.max(1, p);
    const validLimit = isNaN(l) ? 20 : Math.min(100, Math.max(1, l));
    const skip = (validPage - 1) * validLimit;
    const take = validLimit;

    const result = await approvalService.getPendingSecondEngineer(operatorId, skip, take);

    return res.status(200).json({
      data: result.data,
      total: result.total,
      page: validPage,
      limit: take
    });
  } catch (error) {
    console.error('[ApprovalController]', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * GET /api/approvals/pending-manager (DEPRECATED)
 */
const getPendingManager = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const operatorId = req.user?.operatorId;

    const p = parseInt(page, 10);
    const l = parseInt(limit, 10);
    const validPage = isNaN(p) ? 1 : Math.max(1, p);
    const validLimit = isNaN(l) ? 20 : Math.min(100, Math.max(1, l));
    const skip = (validPage - 1) * validLimit;
    const take = validLimit;

    const result = await approvalService.getPendingManager(operatorId, skip, take);

    return res.status(200).json({
      data: result.data,
      total: result.total,
      page: validPage,
      limit: take
    });
  } catch (error) {
    console.error('[ApprovalController]', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

module.exports = {
  getApprovals,
  getInbox,
  getMySubmissions,
  getHistory,
  getApprovalByEesId,
  postReview,
  rejectApproval,
  submitForApproval,
  resubmitForApproval,
  getPendingSecondEngineer,
  getPendingManager
};
