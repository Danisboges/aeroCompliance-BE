const express = require('express');
const router = express.Router();
const edsController = require('../controllers/edsController');
const { verifyToken } = require('../middleware/authMiddleware');

// Raw body parser for endpoint that receives binary PDF directly
const pdfBodyParser = express.raw({ type: 'application/pdf', limit: '100mb' });

// GET /api/eds (Get all EDS)
router.get('/', verifyToken, edsController.listEds);

// POST /api/eds/upload (Upload EDS PDF)
router.post('/upload', verifyToken, pdfBodyParser, edsController.uploadEdsPdf);

// POST /api/eds/webhook (Ingest EDS JSON directly)
router.post('/webhook', express.json(), edsController.uploadEdsJson);

// GET /api/eds/:id/view (Preview EDS PDF inline)
router.get('/:id/view', verifyToken, edsController.viewEdsPdf);

// GET /api/eds/:id/download (Download EDS PDF)
router.get('/:id/download', verifyToken, edsController.downloadEdsPdf);

// GET /api/eds/:id (Get single EDS by ID)
router.get('/:id', verifyToken, edsController.getEdsById);

module.exports = router;
