const express = require('express');
const router = express.Router();
const eesController = require('../controllers/eesController');
const { handleEesWebhook } = eesController;
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

/**
 * Route: POST /api/webhooks/ees
 * 
 * NOTE: The RBAC middleware (verifyToken, requireRole) is omitted from this route
 * under the assumption that AI webhooks utilize a separate validation method
 * (e.g., verifying a shared secret key header/query param).
 * 
 * If you need to secure this route using JWT-based RBAC in the future, you can write:
 * router.post('/webhooks/ees', verifyToken, requireRole(['ADMIN']), handleEesWebhook);
 */
router.post('/webhooks/ees', handleEesWebhook);

// GET /api/ees (Get all EES documents)
router.get('/', verifyToken, eesController.listEesDocuments);

module.exports = router;
