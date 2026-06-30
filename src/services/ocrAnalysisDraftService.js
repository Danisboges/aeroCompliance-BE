const eesService = require('./eesService');
const ocrDocumentService = require('./ocrDocumentService');
const ocrAnalysisDraftRepository = require('../repositories/ocrAnalysisDraftRepository');

const allowedStatuses = ['DRAFT', 'REVIEW_REQUIRED', 'VALIDATED', 'GENERATED'];

const assertPayloadShape = (payload) => {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('Validation Error: OCR payload must be an object');
  }

  if (!payload.eesNumber || !payload.bulletinNumber || !Array.isArray(payload.evaluations)) {
    throw new Error('Validation Error: OCR payload must contain eesNumber, bulletinNumber, and evaluations array');
  }
};

const parsePositiveInt = (value, fieldName) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`Validation Error: ${fieldName} must be a positive integer`);
  }
  return parsed;
};

const parsePagination = ({ page = 1, limit = 20, status, uploadId } = {}) => {
  const parsedPage = Math.max(Number(page) || 1, 1);
  const parsedLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);

  if (status && !allowedStatuses.includes(status)) {
    throw new Error('Validation Error: invalid draft status');
  }

  return {
    skip: (parsedPage - 1) * parsedLimit,
    take: parsedLimit,
    page: parsedPage,
    limit: parsedLimit,
    status,
    uploadId: uploadId ? parsePositiveInt(uploadId, 'uploadId') : undefined
  };
};

const createDraft = async ({ uploadId, extractedPayload }) => {
  const parsedUploadId = parsePositiveInt(uploadId, 'uploadId');
  await ocrDocumentService.getUploadById(parsedUploadId);
  assertPayloadShape(extractedPayload);

  return ocrAnalysisDraftRepository.createDraft({
    uploadId: parsedUploadId,
    extractedPayload,
    status: 'REVIEW_REQUIRED'
  });
};

const listDrafts = async (query = {}) => {
  const pagination = parsePagination(query);
  const [items, total] = await Promise.all([
    ocrAnalysisDraftRepository.listDrafts(pagination),
    ocrAnalysisDraftRepository.countDrafts({
      status: pagination.status,
      uploadId: pagination.uploadId
    })
  ]);

  return {
    items,
    meta: {
      page: pagination.page,
      limit: pagination.limit,
      total
    }
  };
};

const getDraftById = async (id) => {
  const parsedId = parsePositiveInt(id, 'draft id');
  const draft = await ocrAnalysisDraftRepository.findDraftById(parsedId);

  if (!draft) {
    throw new Error('Not Found: OCR analysis draft does not exist');
  }

  return draft;
};

const updateDraft = async (id, data) => {
  const draft = await getDraftById(id);
  const updates = {};

  if (data.extractedPayload !== undefined) {
    assertPayloadShape(data.extractedPayload);
    updates.extractedPayload = data.extractedPayload;
    updates.status = 'REVIEW_REQUIRED';
  }

  if (data.validatedPayload !== undefined) {
    assertPayloadShape(data.validatedPayload);
    updates.validatedPayload = data.validatedPayload;
    updates.status = 'VALIDATED';
  }

  if (data.status !== undefined) {
    if (!allowedStatuses.includes(data.status)) {
      throw new Error('Validation Error: invalid draft status');
    }
    updates.status = data.status;
  }

  if (Object.keys(updates).length === 0) {
    return draft;
  }

  return ocrAnalysisDraftRepository.updateDraft(draft.id, updates);
};

const validateDraft = async (id, validatedPayload) => {
  const draft = await getDraftById(id);
  const payload = validatedPayload || draft.extractedPayload;
  assertPayloadShape(payload);

  return ocrAnalysisDraftRepository.updateDraft(draft.id, {
    validatedPayload: payload,
    status: 'VALIDATED'
  });
};

const generateEes = async (id) => {
  const draft = await getDraftById(id);

  if (draft.status === 'GENERATED' && draft.generatedEesDocument) {
    return draft;
  }

  const payload = draft.validatedPayload || draft.extractedPayload;
  assertPayloadShape(payload);

  const eesDocument = await eesService.processEesWebhook(payload);

  return ocrAnalysisDraftRepository.updateDraft(draft.id, {
    status: 'GENERATED',
    generatedEesDocumentId: eesDocument.id
  });
};

const deleteDraft = async (id) => {
  const draft = await getDraftById(id);
  return ocrAnalysisDraftRepository.deleteDraft(draft.id);
};

module.exports = {
  createDraft,
  listDrafts,
  getDraftById,
  updateDraft,
  validateDraft,
  generateEes,
  deleteDraft
};
