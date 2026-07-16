const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const svrController = require('../controllers/svrController');

// Raw body parser for endpoint that receives binary PDF directly
const pdfBodyParser = express.raw({ type: 'application/pdf', limit: '100mb' });

// Upload SVR PDF directly (binary payload)
router.post('/shop-visit-reports/upload', verifyToken, pdfBodyParser, svrController.uploadSvrPdf);

// Webhook for SVR JSON ingestion
router.post('/webhooks/svr', svrController.uploadSvrJson);

// SVR lists and details
router.get('/shop-visit-reports', verifyToken, svrController.listShopVisitReports);
router.get('/shop-visit-reports/:id', verifyToken, svrController.getShopVisitReport);

// Stream PDF
router.get('/shop-visit-reports/:id/view', verifyToken, svrController.viewSvrPdf);
router.get('/shop-visit-reports/:id/download', verifyToken, svrController.downloadSvrPdf);

// Delete SVR
router.delete('/shop-visit-reports/:id', verifyToken, svrController.deleteShopVisitReport);

module.exports = router;
