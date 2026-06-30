const express = require('express');
const router = express.Router();
const ocrAnalysisDraftController = require('../controllers/ocrAnalysisDraftController');

router.get('/ocr-drafts', ocrAnalysisDraftController.listDrafts);
router.post('/ocr-drafts', ocrAnalysisDraftController.createDraft);
router.get('/ocr-drafts/:id', ocrAnalysisDraftController.getDraft);
router.patch('/ocr-drafts/:id', ocrAnalysisDraftController.updateDraft);
router.post('/ocr-drafts/:id/validate', ocrAnalysisDraftController.validateDraft);
router.post('/ocr-drafts/:id/generate-ees', ocrAnalysisDraftController.generateEes);
router.delete('/ocr-drafts/:id', ocrAnalysisDraftController.deleteDraft);

module.exports = router;
