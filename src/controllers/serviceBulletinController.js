const fs = require('fs');
const serviceBulletinService = require('../services/serviceBulletinService');
const pdfGenerationService = require('../services/pdfGenerationService');

const eesRepository = require('../repositories/eesRepository');

const handleControllerError = (res, error) => {
  console.error("[ServiceBulletinController]", {
    name: error.name,
    message: error.message,
    stack: error.stack,
  });

  if (error.message.startsWith("Validation Error")) {
    return res.status(400).json({ error: error.message });
  }

  if (error.message.startsWith("Not Found")) {
    return res.status(404).json({ error: error.message });
  }

  return res.status(500).json({
    error: "Internal Server Error",
    details: error.message,
  });
};

/**
 * Format ServiceBulletin response based on route path for backward compatibility.
 */
const formatSbResponse = (sb, originalUrl = '') => {
  if (!sb) return null;
  // Convert prisma serializeable object to plain JSON to allow virtual properties
  const sbJson = JSON.parse(JSON.stringify(sb));

  const status = sbJson.ocrResult?.draftStatus || sbJson.status || 'DRAFT';
  const syncStatus = sbJson.generatedEes ? 'SYNC' : 'UNSYNC';
  
  const result = {
    ...sbJson,
    status,
    syncStatus,
    confidenceScore: sbJson.ocrResult?.confidenceScore || null,
    modelConfidenceScore: sbJson.ocrResult?.modelConfidenceScore || null
  };

  if (status !== 'GENERATED') {
    result.rawPayload = sbJson.ocrResult?.rawPayload;
  }

  // Add virtual sb property pointing back to the result details (without circular references)
  // to ensure compatibility with older clients expecting draft.sb.generatedEes
  result.sb = {
    id: sbJson.id,
    sbNumber: sbJson.sbNumber,
    title: sbJson.title,
    issuer: sbJson.issuer,
    issueDate: sbJson.issueDate,
    status,
    inputSource: sbJson.inputSource,
    
    generatedEes: sbJson.generatedEes
  };

  return result;
};

/**
 * Format lightweight DTO for list response
 */
const formatSbListResponse = (sb) => {
  if (!sb) return null;
  const sbJson = JSON.parse(JSON.stringify(sb));
  
  const result = {
    ...sbJson,
    ocrStatus: sbJson.ocrResult?.ocrStatus || 'UPLOADED',
    draftStatus: sbJson.ocrResult?.draftStatus || sbJson.status || 'DRAFT',
    syncStatus: sbJson.generatedEes ? 'SYNC' : 'UNSYNC',
    inputSource: sbJson.inputSource,
    
    confidenceScore: sbJson.ocrResult?.confidenceScore || null,
    modelConfidenceScore: sbJson.ocrResult?.modelConfidenceScore || null,
    ees: sbJson.generatedEes ? {
      id: sbJson.generatedEes.id,
      eesNumber: sbJson.generatedEes.eesNumber,
      reviewStatus: sbJson.generatedEes.reviewStatus,
      
      createdAt: sbJson.generatedEes.createdAt
    } : null
  };
  
  delete result.ocrResult;
  delete result.generatedEes;
  
  return result;
};

const uploadPdf = async (req, res) => {
  try {
    const fileName = req.headers['x-file-name'];
    const aircraftType = req.headers['x-aircraft-type'] || req.query.aircraftType;
    const result = await serviceBulletinService.processPdf({
      buffer: req.body,
      fileName,
      mimeType: req.headers['content-type'] || 'application/pdf',
      createdById: req.user?.id ?? null,
      aircraftType
    });

    return res.status(201).json({
      message: 'PDF received and processed by OCR pipeline',
      data: {
        ...formatSbResponse(result.upload, req.originalUrl),
        ai: result.ai,
        warning: result.warning
      }
    });
  } catch (error) {
    console.error('Error processing PDF upload:', error);
    return handleControllerError(res, error);
  }
};

const createDraft = async (req, res) => {
  try {
    const { uploadId, payload, extractedPayload } = req.body;
    const result = await serviceBulletinService.updateServiceBulletin(uploadId, {
      extractedPayload: payload || extractedPayload
    }, req.user?.id);
    return res.status(201).json({
      message: 'OCR analysis draft created for user validation',
      data: formatSbResponse(result, req.originalUrl)
    });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

const listServiceBulletins = async (req, res) => {
  try {
    const result = await serviceBulletinService.listServiceBulletins(req.query);
    const formattedItems = result.items.map(item => formatSbListResponse(item));
    return res.status(200).json({ 
      data: formattedItems, 
      pagination: {
        page: result.meta.page,
        limit: result.meta.limit,
        total: result.meta.total,
        totalPages: Math.ceil(result.meta.total / result.meta.limit) || 1
      }
    });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

const getServiceBulletin = async (req, res) => {
  try {
    const result = await serviceBulletinService.getServiceBulletinById(req.params.id);
    return res.status(200).json({ data: formatSbResponse(result, req.originalUrl) });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

const updateServiceBulletin = async (req, res) => {
  try {
    const { payload, extractedPayload, validatedPayload, ocrStatus, draftStatus, status } = req.body;
    const result = await serviceBulletinService.updateServiceBulletin(req.params.id, {
      extractedPayload: payload || extractedPayload,
      validatedPayload,
      ocrStatus,
      draftStatus: draftStatus || status
    }, req.user?.id);
    return res.status(200).json({
      message: 'Service Bulletin updated successfully',
      data: formatSbResponse(result, req.originalUrl)
    });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

const validateServiceBulletin = async (req, res) => {
  try {
    const result = await serviceBulletinService.validateServiceBulletin(req.params.id, req.body.validatedPayload, req.user?.id);
    return res.status(200).json({
      message: 'Service Bulletin draft validated',
      data: formatSbResponse(result, req.originalUrl)
    });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

const path = require('path');

const generateEes = async (req, res) => {
  try {
    const customData = {
      eesNumber: req.body?.eesNumber,
      aircraftType: req.body?.aircraftType,
      
      payload: req.body?.payload
    };
    const result = await serviceBulletinService.generateEes(req.params.id, req.user?.id, customData);
    
    // Handle Creator Signature
    if (req.file) {
      const eesId = result.generatedEes?.id;
      // We need to check if operator is Garuda.
      // EesDocument might not return operator directly, so we can fetch it, OR we can just save it for all and the Citilink template just ignores it.
      // But the rule says: "Jika Citilink, abaikan file (atau tidak wajib). Jika Garuda, simpan". Let's save it for Garuda only.
      // Result should include operator from SB. Let's assume result.operatorId or result.operator.code exists.
      const sbInfo = await serviceBulletinService.getServiceBulletinById(req.params.id);
      const isGaruda = sbInfo.operator?.code === 'GA';
      
      if (isGaruda && eesId) {
        const uploadDir = path.join(__dirname, '../../uploads/signatures');
        const newPath = path.join(uploadDir, `prepared_by_${eesId}.png`);
        fs.renameSync(req.file.path, newPath);
      } else {
        // Delete if not Garuda or eesId missing
        fs.unlinkSync(req.file.path);
      }
    }

    return res.status(201).json({
      message: 'EES document generated from validated Service Bulletin draft',
      data: formatSbResponse(result, req.originalUrl)
    });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

const deleteServiceBulletin = async (req, res) => {
  try {
    // Check if it exists first
    const sb = await serviceBulletinService.getServiceBulletinById(req.params.id).catch(() => null);
    if (!sb) {
      return res.status(200).json({
        message: 'Service Bulletin already deleted or does not exist',
        data: null
      });
    }

    const result = await serviceBulletinService.deleteServiceBulletin(req.params.id);
    return res.status(200).json({
      message: 'Service Bulletin deleted successfully',
      data: formatSbResponse(result, req.originalUrl)
    });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

const viewPdf = async (req, res) => {
  try {
    const { storagePath, fileName, mimeType } = await serviceBulletinService.getServiceBulletinFile(req.params.id);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
    return fs.createReadStream(storagePath).pipe(res);
  } catch (error) {
    return handleControllerError(res, error);
  }
};

const downloadPdf = async (req, res) => {
  try {
    const { storagePath, fileName, mimeType } = await serviceBulletinService.getServiceBulletinFile(req.params.id);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    return fs.createReadStream(storagePath).pipe(res);
  } catch (error) {
    return handleControllerError(res, error);
  }
};

const generateEesPdf = async (req, res) => {
  try {
    const sb = await serviceBulletinService.getServiceBulletinById(req.params.id);
    const templateType = req.body.template || 'GARUDA';
    const pdfBuffer = await pdfGenerationService.generateEesPdf({ sb, templateType });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="ees-${sb.sbNumber}.pdf"`);
    return res.send(pdfBuffer);
  } catch (error) {
    return handleControllerError(res, error);
  }
};

const getServiceBulletinLogs = async (req, res) => {
  try {
    const logs = await serviceBulletinService.getServiceBulletinLogs(req.params.id);
    return res.status(200).json({ data: logs });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

module.exports = {
  uploadPdf,
  createDraft,
  listServiceBulletins,
  getServiceBulletin,
  updateServiceBulletin,
  validateServiceBulletin,
  generateEes,
  deleteServiceBulletin,
  viewPdf,
  downloadPdf,
  generateEesPdf,
  // New handlers for Step 1-5 of EES workflow
  uploadPdfToExistingSb,
  uploadNewSb,
  analyzeExistingSb,
  getAiSummary,
  updateAiSummary,
  getEesDocument,
  updateEesDocument,
  getServiceBulletinLogs,
  
};

/**
 * POST /api/service-bulletins/:id/upload-pdf
 * Uploads a PDF file to an EXISTING ServiceBulletin (replaces file for testing/analysis).
 */
async function uploadPdfToExistingSb(req, res) {
  try {
    const sb = await serviceBulletinService.getServiceBulletinById(req.params.id);
    const fileName = req.headers['x-file-name'] || `${sb.sbNumber}.pdf`;
    const aircraftType = req.headers['x-aircraft-type'] || req.query.aircraftType;
    const result = await serviceBulletinService.processPdf({
      buffer: req.body,
      fileName,
      mimeType: req.headers['content-type'] || 'application/pdf',
      createdById: req.user?.id ?? null,
      existingSbId: sb.id,
      aircraftType
    });
    return res.status(200).json({
      message: 'PDF uploaded to existing SB',
      data: formatSbResponse(result.upload, req.originalUrl),
    });
  } catch (error) {
    return handleControllerError(res, error);
  }
}

/**
 * POST /api/service-bulletins/:id/analyze
 * Triggers AI analysis of the uploaded SB PDF (Step 3).
 */
async function analyzeExistingSb(req, res) {
  try {
    const sb = await serviceBulletinService.getServiceBulletinById(req.params.id);
    // If there is no uploaded file on this SB, return error
    if (!sb.storedFileName) {
      return res.status(400).json({ error: 'Validation Error: No PDF file uploaded for this SB. Upload a file first.' });
    }
    const result = await serviceBulletinService.triggerAiAnalysis(sb.id, req.user?.id);
    return res.status(200).json({
      message: 'AI analysis triggered successfully',
      data: formatSbResponse(result, req.originalUrl),
    });
  } catch (error) {
    return handleControllerError(res, error);
  }
}

/**
 * GET /api/service-bulletins/:id/ai-summary
 * Returns the current AI analysis result (rawPayload) for an SB (Step 3).
 */
async function getAiSummary(req, res) {
  try {
    const sb = await serviceBulletinService.getServiceBulletinById(req.params.id);
    return res.status(200).json({
      data: {
        sbId: sb.id,
        sbNumber: sb.sbNumber,
        draftStatus: sb.ocrResult?.draftStatus,
        ocrStatus: sb.ocrResult?.ocrStatus,
        aiSummary: sb.ocrResult?.rawPayload || null,
        extractedAt: sb.extractedAt,
      }
    });
  } catch (error) {
    return handleControllerError(res, error);
  }
}

/**
 * PATCH /api/service-bulletins/:id/ai-summary
 * User reviews and optionally edits the AI result, then confirms (Step 3).
 */
async function updateAiSummary(req, res) {
  try {
    const { validatedPayload } = req.body;
    const result = await serviceBulletinService.validateServiceBulletin(
      req.params.id,
      validatedPayload,
      req.user?.id
    );
    return res.status(200).json({
      message: 'AI summary reviewed and confirmed',
      data: formatSbResponse(result, req.originalUrl),
    });
  } catch (error) {
    return handleControllerError(res, error);
  }
}

/**
 * GET /api/service-bulletins/:id/ees
 * Returns the generated EES document for an SB (Step 5).
 */
async function getEesDocument(req, res) {
  try {
    const sb = await serviceBulletinService.getServiceBulletinById(req.params.id);
    if (!sb.generatedEes) {
      return res.status(404).json({ error: 'Not Found: No EES document generated for this SB yet' });
    }
    const approval = sb.generatedEes.approval;
    const approvalIsPending = approval && ['PENDING', 'PARTIALLY_APPROVED'].includes(approval.status);
    const isMaker = approval?.submittedById === req.user?.id;
    const isAssignee = approval?.assignedToId === req.user?.id;
    const canRevise = approval && ['REJECTED', 'RETURNED'].includes(approval.status) &&
      (isMaker || req.user?.role === 'ADMIN');
    const eesData = {
      ...sb.generatedEes,
      serviceBulletin: {
        id: sb.id,
        sbNumber: sb.sbNumber,
        revision: sb.revision,
        title: sb.title,
        status: sb.status,
        operator: sb.operator,
        aircraftType: sb.aircraftType,
        effectivityType: sb.effectivityType,
        applicabilitySummary: sb.applicabilitySummary
      },
      permissions: {
        canEdit: (!approval && sb.generatedEes.reviewStatus === 'PENDING') || canRevise,
        canReview: approvalIsPending && isAssignee && req.user?.role === 'ENGINEER',
        canApprove: approvalIsPending && isAssignee && req.user?.role === 'MANAGER',
        canResubmit: canRevise,
      }
    };
    return res.status(200).json({ data: eesData });
  } catch (error) {
    return handleControllerError(res, error);
  }
}

/**
 * PATCH /api/service-bulletins/:id/ees
 * Update the EES evaluation items (user editing before export, Step 5).
 */
async function updateEesDocument(req, res) {
  try {
    const existingEes = await eesRepository.getEesDocumentBySbId(req.params.id);

    if (existingEes?.approval) {
      const approval = existingEes.approval;
      if (['PENDING', 'PARTIALLY_APPROVED', 'APPROVED'].includes(approval.status)) {
        return res.status(409).json({
          error: 'Conflict',
          details: 'EES yang sedang atau sudah selesai diproses tidak dapat diregenerate.',
        });
      }
      const isOriginalMaker = approval.submittedById === req.user?.id;
      if (!isOriginalMaker && req.user?.role !== 'ADMIN') {
        return res.status(403).json({
          error: 'Forbidden',
          details: 'Hanya maker awal yang dapat merevisi EES yang dikembalikan atau ditolak.',
        });
      }
    }
    if (!existingEes?.approval && existingEes?.reviewStatus === 'APPROVED') {
      return res.status(409).json({
        error: 'Conflict',
        details: 'EES yang sudah disetujui tidak dapat diregenerate.',
      });
    }

    const { validatedPayload } = req.body;
    if (!validatedPayload) {
      return res.status(400).json({ error: 'Validation Error: validatedPayload is required' });
    }
    // Re-validate and regenerate EES from user-edited payload
    await serviceBulletinService.validateServiceBulletin(req.params.id, validatedPayload, req.user?.id);
    const result = await serviceBulletinService.generateEes(req.params.id, req.user?.id, { isManualEdited: true });
    return res.status(200).json({
      message: 'EES document updated successfully',
      data: formatSbResponse(result, req.originalUrl),
    });
  } catch (error) {
    console.error('[ServiceBulletinController.updateEesDocument]', {
      serviceBulletinId: req.params.id,
      errorName: error.name,
      errorCode: error.code,
      message: error.message,
      stack: error.stack
    });
    return handleControllerError(res, error);
  }
}

/**
 * POST /api/service-bulletins/upload-new
 * Sumber B: Upload PDF SB baru yang belum ada di database.
 * Buat record SB baru → simpan file → jalankan AI → SB siap untuk Step 2-6.
 */
async function uploadNewSb(req, res) {
  try {
    const fileName = req.headers['x-file-name'];
    const aircraftType = req.headers['x-aircraft-type'] || req.query.aircraftType;

    const result = await serviceBulletinService.processPdf({
      buffer: req.body,
      fileName,
      mimeType: req.headers['content-type'] || 'application/pdf',
      createdById: req.user?.id ?? null,
      aircraftType,
      operatorId: req.user?.operatorId ?? null,
      inputSource: 'USER_UPLOAD',
      
    });

    return res.status(201).json({
      message: 'SB baru berhasil dibuat dari file PDF yang diupload',
      data: {
        ...formatSbResponse(result.upload, req.originalUrl),
        ai: result.ai,
        warning: result.warning
      }
    });
  } catch (error) {
    console.error('Error uploading new SB:', error);
    return handleControllerError(res, error);
  }
}
