const dashboardService = require('../services/dashboardService');

/**
 * GET /api/dashboard/engineering-review/summary
 */
const getSummary = async (req, res) => {
  try {
    const { month, recentLimit, operatorId, timezone } = req.query;
    
    let targetMonth = month;
    if (!targetMonth) {
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      targetMonth = `${yyyy}-${mm}`;
    } else if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(targetMonth)) {
      return res.status(400).json({ error: 'Invalid month parameter. Use YYYY-MM format.' });
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
      month: targetMonth,
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
