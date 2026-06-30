const ocrAnalysisDraftService = require('../services/ocrAnalysisDraftService');

const handleControllerError = (res, error) => {
  if (error.message.startsWith('Validation Error')) {
    return res.status(400).json({ error: error.message });
  }

  if (error.message.startsWith('Not Found')) {
    return res.status(404).json({ error: error.message });
  }

  return res.status(500).json({
    error: 'Internal Server Error',
    details: error.message
  });
};

const createDraft = async (req, res) => {
  try {
    const result = await ocrAnalysisDraftService.createDraft(req.body);
    return res.status(201).json({
      message: 'OCR analysis draft created for user validation',
      data: result
    });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

const listDrafts = async (req, res) => {
  try {
    const result = await ocrAnalysisDraftService.listDrafts(req.query);
    return res.status(200).json({ data: result.items, meta: result.meta });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

const getDraft = async (req, res) => {
  try {
    const result = await ocrAnalysisDraftService.getDraftById(req.params.id);
    return res.status(200).json({ data: result });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

const updateDraft = async (req, res) => {
  try {
    const result = await ocrAnalysisDraftService.updateDraft(req.params.id, req.body);
    return res.status(200).json({
      message: 'OCR analysis draft updated',
      data: result
    });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

const validateDraft = async (req, res) => {
  try {
    const result = await ocrAnalysisDraftService.validateDraft(req.params.id, req.body.validatedPayload);
    return res.status(200).json({
      message: 'OCR analysis draft validated',
      data: result
    });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

const generateEes = async (req, res) => {
  try {
    const result = await ocrAnalysisDraftService.generateEes(req.params.id);
    return res.status(201).json({
      message: 'EES document generated from validated OCR draft',
      data: result
    });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

const deleteDraft = async (req, res) => {
  try {
    const result = await ocrAnalysisDraftService.deleteDraft(req.params.id);
    return res.status(200).json({
      message: 'OCR analysis draft deleted',
      data: result
    });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

module.exports = {
  createDraft,
  listDrafts,
  getDraft,
  updateDraft,
  validateDraft,
  generateEes,
  deleteDraft
};
