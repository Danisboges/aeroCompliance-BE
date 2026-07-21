const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const sbListController = require('../controllers/sbListController');
const applicabilityController = require('../controllers/applicabilityController');
const engineeringRecController = require('../controllers/engineeringRecController');
const exportController = require('../controllers/exportController');
const serviceBulletinController = require('../controllers/serviceBulletinController');
const { uploadSignature } = require('../middleware/uploadMiddleware');

// Raw body parser untuk endpoint yang menerima binary PDF langsung
const pdfBodyParser = express.raw({ type: 'application/pdf', limit: '100mb' });

// ── Step 1: Select SB / Upload SB Baru ───────────────────────────────────────
// Sumber A: List semua SB dari database perusahaan (with search/filter)
router.get('/service-bulletins', verifyToken, sbListController.listServiceBulletins);
// Get single SB detail
router.get('/service-bulletins/:id', verifyToken, sbListController.getServiceBulletin);
// Sumber A: Upload PDF ke SB yang sudah ada di database → AI analisis otomatis
router.post('/service-bulletins/:id/upload-pdf', verifyToken, pdfBodyParser, serviceBulletinController.uploadPdfToExistingSb);
// Sumber B: Upload PDF SB baru (belum ada di database) → buat SB baru + AI analisis otomatis
router.post('/service-bulletins/upload-new', verifyToken, pdfBodyParser, serviceBulletinController.uploadNewSb);
// View original SB PDF document inline
router.get('/service-bulletins/:id/view', verifyToken, serviceBulletinController.viewPdf);
// Download original SB PDF document
router.get('/service-bulletins/:id/download', verifyToken, serviceBulletinController.downloadPdf);

// ── Step 2: Applicability ────────────────────────────────────────────────────
// Get applicability check results for all fleet engines vs this SB
router.get('/service-bulletins/:id/applicability', verifyToken, applicabilityController.checkApplicability);

// ── Step 3: AI Summary (hasil AI otomatis dari Step 1 upload) ────────────────
// Get the latest AI summary / raw payload
router.get('/service-bulletins/:id/ai-summary', verifyToken, serviceBulletinController.getAiSummary);
// Validate / update the AI summary (user edits)
router.patch('/service-bulletins/:id/ai-summary', verifyToken, serviceBulletinController.updateAiSummary);

// ── Step 4: Engineering Recommendation ───────────────────────────────────────
// Get recommendation for this SB
router.get('/service-bulletins/:id/engineering-rec', verifyToken, engineeringRecController.getEngineeringRec);
// Save/update recommendation (Comply / Defer / N/A + Priority + Notes)
router.post('/service-bulletins/:id/engineering-rec', verifyToken, engineeringRecController.saveEngineeringRec);
router.patch('/service-bulletins/:id/engineering-rec', verifyToken, engineeringRecController.saveEngineeringRec);

// ── Step 5: Generate EES ──────────────────────────────────────────────────────
// Generate EES document from AI results
router.post('/service-bulletins/:id/generate-ees', verifyToken, uploadSignature.single('signature'), serviceBulletinController.generateEes);
// Get the generated EES document
router.get('/service-bulletins/:id/ees', verifyToken, serviceBulletinController.getEesDocument);
// Edit EES evaluation items before export
router.patch('/service-bulletins/:id/ees', verifyToken, serviceBulletinController.updateEesDocument);

// ── Step 6: Export ────────────────────────────────────────────────────────────
// Garuda template export
router.get('/service-bulletins/:id/export/garuda/pdf', verifyToken, exportController.exportGarudaPdf);
router.get('/service-bulletins/:id/export/garuda/pdf/download', verifyToken, exportController.downloadGarudaPdf);

// Citilink template export
router.get('/service-bulletins/:id/export/citilink/pdf', verifyToken, exportController.exportCitilinkPdf);
router.get('/service-bulletins/:id/export/citilink/pdf/download', verifyToken, exportController.downloadCitilinkPdf);

// Download Excel
router.get('/service-bulletins/:id/export/excel', verifyToken, exportController.downloadExcel);

// ── Cleanup ──────────────────────────────────────────────────────────────────
// Delete SB record (for testing/cleanup)
router.delete('/service-bulletins/:id', verifyToken, serviceBulletinController.deleteServiceBulletin);

module.exports = router;
