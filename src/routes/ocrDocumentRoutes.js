const express = require('express');
const router = express.Router();
const ocrDocumentController = require('../controllers/ocrDocumentController');

const pdfBodyParser = express.raw({
  type: 'application/pdf',
  limit: '25mb'
});

router.get('/documents/ocr', ocrDocumentController.listUploads);
router.post('/documents/ocr/pdf', pdfBodyParser, ocrDocumentController.uploadPdf);
router.post('/documents/ocr/base64', ocrDocumentController.uploadPdfBase64);
router.get('/documents/ocr/:id', ocrDocumentController.getUpload);
router.patch('/documents/ocr/:id', ocrDocumentController.updateUpload);
router.get('/documents/ocr/:id/view', ocrDocumentController.viewUploadFile);
router.get('/documents/ocr/:id/download', ocrDocumentController.downloadUploadFile);
router.delete('/documents/ocr/:id', ocrDocumentController.deleteUpload);

module.exports = router;
