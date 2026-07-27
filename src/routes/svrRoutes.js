const express = require('express');
const router = express.Router();
const multer = require('multer');
const { verifyToken } = require('../middleware/authMiddleware');
const svrController = require('../controllers/svrController');

// Raw body parser for endpoint that receives binary PDF directly
const pdfBodyParser = express.raw({ type: 'application/pdf', limit: '100mb' });

// Multer parser for SVR multi-file upload
const uploadMultiSvr = multer({ 
  storage: multer.memoryStorage(), 
  limits: { files: 6, fileSize: 100 * 1024 * 1024 } 
});

// Upload Engine PDF directly (SVR, EDS, IQ03) - separated endpoints
router.post(
  '/shop-visit-reports/upload/SVR', 
  verifyToken, 
  uploadMultiSvr.array('files', 6),
  pdfBodyParser, // Fallback for raw binary application/pdf
  (req, res, next) => { req.params.docType = 'SVR'; next(); }, 
  svrController.uploadEngineDocPdf
);
router.post('/engine-data-sheets/upload/EDS', verifyToken, pdfBodyParser, (req, res, next) => { req.params.docType = 'EDS'; next(); }, svrController.uploadEngineDocPdf);
router.post('/iq03-reports/upload/IQ03', verifyToken, pdfBodyParser, (req, res, next) => { req.params.docType = 'IQ03'; next(); }, svrController.uploadEngineDocPdf);

// Webhook for SVR, EDS, and IQ03 JSON ingestion
router.post('/webhooks/svr', svrController.uploadSvrJson);
router.post('/webhooks/eds', svrController.uploadEdsJson);
router.post('/webhooks/iq03', svrController.uploadIq03Json);

// SVR lists and details
router.get('/shop-visit-reports', verifyToken, svrController.listShopVisitReports);
router.get('/shop-visit-reports/:id', verifyToken, svrController.getShopVisitReport);

// Stream PDF
router.get('/shop-visit-reports/:id/view', verifyToken, svrController.viewSvrPdf);
router.get('/shop-visit-reports/:id/download', verifyToken, svrController.downloadSvrPdf);

// Delete SVR
router.delete('/shop-visit-reports/:id', verifyToken, svrController.deleteShopVisitReport);

module.exports = router;
