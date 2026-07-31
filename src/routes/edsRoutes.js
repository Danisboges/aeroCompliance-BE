const express = require('express');
const router = express.Router();
const edsController = require('../controllers/edsController');
const { verifyToken } = require('../middleware/authMiddleware');

// GET /api/eds (Get all EDS)
router.get('/', verifyToken, edsController.listEds);

// GET /api/eds/:id/view (Preview EDS PDF inline)
router.get('/:id/view', verifyToken, edsController.viewEdsPdf);

// GET /api/eds/:id/download (Download EDS PDF)
router.get('/:id/download', verifyToken, edsController.downloadEdsPdf);

// GET /api/eds/:id (Get single EDS by ID)
router.get('/:id', verifyToken, edsController.getEdsById);

module.exports = router;
