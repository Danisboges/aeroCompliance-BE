const approvalService = require('../services/approvalService');

/**
 * GET /api/approvals
 */
const getApprovals = async (req, res) => {
  try {
    const { status, assigneeId, page = 1, limit = 20 } = req.query;
    
    // Scoping to current operator
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
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * GET /api/approvals/:eesId
 */
const getApprovalByEesId = async (req, res) => {
  try {
    const { eesId } = req.params;
    const operatorId = req.user?.operatorId;

    const result = await approvalService.getApprovalByEesId(eesId, operatorId);

    return res.status(200).json({
      data: result
    });
  } catch (error) {
    console.error('[ApprovalController]', error);
    if (error.message.includes('not found') || error.message.includes('Unauthorized')) {
      return res.status(404).json({ error: error.message });
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

    if (!action) {
      return res.status(400).json({ error: 'Action is required (APPROVED, REJECTED, RETURNED)' });
    }

    const result = await approvalService.submitReview({
      eesId,
      action,
      comment,
      nextAssignedToId,
      actorId: req.user.id,
      actorRole: req.user.role,
      signatureFile: req.file
    });

    return res.status(200).json({
      message: `Review submitted successfully: ${action}`,
      data: result
    });
  } catch (error) {
    console.error('[ApprovalController]', error);
    if (error.message.includes('Invalid') || error.message.includes('found')) {
      return res.status(400).json({ error: error.message });
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

    if (!assignedToId) {
      return res.status(400).json({ error: 'assignedToId is required' });
    }

    const result = await approvalService.submitForApproval({
      eesId,
      assignedToId,
      submitterId: req.user.id
    });

    return res.status(200).json({
      message: 'Approval process initiated successfully',
      data: result
    });
  } catch (error) {
    console.error('[ApprovalController]', error);
    if (error.message.includes('already') || error.message.includes('found')) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};
/**
 * GET /api/approvals/pending-second-engineer
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
 * GET /api/approvals/pending-manager
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
  getPendingSecondEngineer,
  getPendingManager,
  getApprovalByEesId,
  postReview,
  submitForApproval
};
