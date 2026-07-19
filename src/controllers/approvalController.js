const approvalService = require('../services/approvalService');

/**
 * GET /api/approvals
 */
const getApprovals = async (req, res) => {
  try {
    const { status, assigneeId, page = 1, limit = 20 } = req.query;
    
    // Scoping to current operator
    const operatorId = req.user?.operatorId;

    const skip = (Math.max(1, parseInt(page, 10)) - 1) * Math.min(100, Math.max(1, parseInt(limit, 10)));
    const take = Math.min(100, Math.max(1, parseInt(limit, 10)));

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
      page: parseInt(page, 10),
      limit: take
    });
  } catch (error) {
    console.error('[ApprovalController]', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * POST /api/approvals/:eesId/review
 */
const postReview = async (req, res) => {
  try {
    const { eesId } = req.params;
    const { action, comment } = req.body;

    if (!action) {
      return res.status(400).json({ error: 'Action is required (APPROVED, REJECTED, RETURNED)' });
    }

    const result = await approvalService.submitReview({
      eesId,
      action,
      comment,
      actorId: req.user.id,
      actorRole: req.user.role
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

module.exports = {
  getApprovals,
  postReview
};
