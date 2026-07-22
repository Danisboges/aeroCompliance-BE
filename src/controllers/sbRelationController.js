const sbRelationService = require('../services/sbRelationService');
const sbFulfillmentService = require('../services/sbFulfillmentService');

/**
 * GET /api/service-bulletins/:id/relations
 */
const getSbRelations = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await sbRelationService.getSbRelations(id);
    return res.status(200).json({ data: result });
  } catch (error) {
    console.error('[SbRelationController]', error);
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * GET /api/service-bulletins/:id/lineage
 */
const getSbLineageTree = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await sbRelationService.getSbLineageTree(id);
    return res.status(200).json({ data: result });
  } catch (error) {
    console.error('[SbRelationController]', error);
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * POST /api/service-bulletins/:id/relations
 */
const createSbRelation = async (req, res) => {
  try {
    const { id: sourceSbId } = req.params;
    const { targetSbNumber, relationType, conditionType, remarks } = req.body;

    if (!targetSbNumber || !relationType) {
      return res.status(400).json({ error: 'targetSbNumber and relationType are required' });
    }

    const relation = await sbRelationService.createSbRelation({
      sourceSbId,
      targetSbNumber,
      relationType,
      conditionType,
      remarks
    });

    return res.status(201).json({
      message: 'SB relation created successfully',
      data: relation
    });
  } catch (error) {
    console.error('[SbRelationController]', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * GET /api/engines/:engineId/compliance-summary
 */
const getEngineComplianceSummary = async (req, res) => {
  try {
    const { engineId } = req.params;
    const result = await sbFulfillmentService.getEngineComplianceSummary(engineId);
    return res.status(200).json({ data: result });
  } catch (error) {
    console.error('[SbRelationController]', error);
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

module.exports = {
  getSbRelations,
  getSbLineageTree,
  createSbRelation,
  getEngineComplianceSummary
};
