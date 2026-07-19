const dashboardService = require('../services/dashboardService');

/**
 * GET /api/dashboard/engineering-review/summary
 */
const getSummary = async (req, res) => {
  try {
    const { month, recentLimit, operatorId, timezone } = req.query;
    
    // Validation
    if (!month || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
      return res.status(400).json({ error: 'Invalid or missing month parameter. Use YYYY-MM format.' });
    }

    // RBAC and Operator isolation check
    // If the user is tied to an operator, enforce that operator.
    let effectiveOperatorId = operatorId;
    if (req.user && req.user.operatorId) {
      if (operatorId && operatorId !== req.user.operatorId) {
        return res.status(403).json({ error: 'Forbidden: Cannot access dashboard data outside your operator scope' });
      }
      effectiveOperatorId = req.user.operatorId;
    }

    const summary = await dashboardService.getDashboardSummary({
      month,
      recentLimit,
      operatorId: effectiveOperatorId,
      userId: req.user.id
    });

    return res.status(200).json({
      message: 'Dashboard summary retrieved successfully',
      data: summary
    });

  } catch (error) {
    console.error('[DashboardController]', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

module.exports = {
  getSummary
};
