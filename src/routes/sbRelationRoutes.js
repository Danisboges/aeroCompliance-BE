const express = require('express');
const router = express.Router();
const sbRelationController = require('../controllers/sbRelationController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');
const { Role } = require('@prisma/client');

// GET /api/service-bulletins/:id/relations
router.get('/service-bulletins/:id/relations', verifyToken, sbRelationController.getSbRelations);

// GET /api/service-bulletins/:id/lineage
router.get('/service-bulletins/:id/lineage', verifyToken, sbRelationController.getSbLineageTree);

// POST /api/service-bulletins/:id/relations
router.post('/service-bulletins/:id/relations', verifyToken, requireRole([Role.ENGINEER, Role.ADMIN]), sbRelationController.createSbRelation);

// GET /api/engines/:engineId/compliance-summary
router.get('/engines/:engineId/compliance-summary', verifyToken, sbRelationController.getEngineComplianceSummary);

module.exports = router;
