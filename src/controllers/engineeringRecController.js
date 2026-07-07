const engineeringRecService = require('../services/engineeringRecService');

const handleControllerError = (res, error) => {
  if (error.message.startsWith('Validation Error')) {
    return res.status(400).json({ error: error.message });
  }
  if (error.message.startsWith('Not Found')) {
    return res.status(404).json({ error: error.message });
  }
  console.error('[EngineeringRecController]', error);
  return res.status(500).json({ error: 'Internal Server Error', details: error.message });
};

/**
 * POST /api/service-bulletins/:id/engineering-rec
 * Save or update an Engineering Recommendation for a given SB.
 */
const saveEngineeringRec = async (req, res) => {
  try {
    const result = await engineeringRecService.saveEngineeringRec(
      req.params.id,
      req.body,
      req.user?.id
    );
    return res.status(200).json({
      message: 'Engineering recommendation saved successfully',
      data: result,
    });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

/**
 * GET /api/service-bulletins/:id/engineering-rec
 * Get the Engineering Recommendation for a given SB.
 */
const getEngineeringRec = async (req, res) => {
  try {
    const result = await engineeringRecService.getEngineeringRec(req.params.id);
    if (!result) {
      return res.status(404).json({ error: 'Not Found: No engineering recommendation found for this SB' });
    }
    return res.status(200).json({ data: result });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

module.exports = { saveEngineeringRec, getEngineeringRec };
