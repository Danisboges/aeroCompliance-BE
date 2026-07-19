const crypto = require('crypto');
const path = require('path');
const prisma = require('../db');
const fileStorageService = require('./fileStorageService');
const serviceBulletinRepository = require('../repositories/serviceBulletinRepository');
const ocrClient = require('../clients/ocrClient');
const eesService = require('./eesService');
const pdfGenerationService = require('./pdfGenerationService');
const eesRepository = require('../repositories/eesRepository');
const { normalizeOcrPayload } = require('./eesService');

const PDF_SIGNATURE = '%PDF';

const assertPdfBuffer = (buffer) => {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new Error('Validation Error: PDF file is required');
  }

  const signature = buffer.subarray(0, 4).toString('utf8');
  if (signature !== PDF_SIGNATURE) {
    throw new Error('Validation Error: uploaded file must be a valid PDF');
  }
};

const normalizeFileName = (fileName) => {
  if (!fileName || typeof fileName !== 'string') {
    return 'uploaded-document.pdf';
  }
  const cleaned = fileName.replace(/[\\/:*?"<>|]/g, '-').trim();
  return cleaned || 'uploaded-document.pdf';
};

const assertPayloadShape = (payload) => {
  normalizeOcrPayload(payload);
};

const validateStringId = (value, fieldName) => {
  if (!value || typeof value !== 'string' || value.trim().length === 0) {
    throw new Error('Validation Error: ' + fieldName + ' must be a non-empty string');
  }
  return value.trim();
};

const parsePagination = ({ page = 1, limit = 20, ocrStatus, draftStatus } = {}) => {
  const parsedPage = Math.max(Number(page) || 1, 1);
  const parsedLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);

  const allowedOcrStatuses = ['UPLOADED', 'PROCESSING', 'EXTRACTED', 'REVIEW_REQUIRED', 'FAILED'];
  const allowedDraftStatuses = ['DRAFT', 'REVIEW_REQUIRED', 'VALIDATED', 'GENERATED'];

  if (ocrStatus && !allowedOcrStatuses.includes(ocrStatus)) {
    throw new Error('Validation Error: invalid OCR status');
  }
  if (draftStatus && !allowedDraftStatuses.includes(draftStatus)) {
    throw new Error('Validation Error: invalid draft status');
  }

  return {
    skip: (parsedPage - 1) * parsedLimit,
    take: parsedLimit,
    page: parsedPage,
    limit: parsedLimit,
    ocrStatus,
    draftStatus
  };
};

/**
 * Upload PDF → Save to DB (TEMP) → Store physically → Run AI → Resolve and Save/Merge SB.
 */
const processPdf = async ({ buffer, fileName, mimeType = 'application/pdf', createdById = null }) => {
  assertPdfBuffer(buffer);

  const originalFileName = normalizeFileName(fileName);
  const checksum = crypto.createHash('sha256').update(buffer).digest('hex');

  // STEP 1: Simpan record SB PENDING/TEMP ke DB
  // Menggunakan sbNumber unik sementara agar tidak melanggar unique constraint
  const tempSbNumber = `TEMP-${checksum.slice(0, 12).toUpperCase()}-${Date.now()}`;
  const sb = await serviceBulletinRepository.createServiceBulletin({
    sbNumber: tempSbNumber,
    title: 'PENDING_AI',
    issuer: 'PENDING_AI',
    issueDate: new Date(),
    originalFileName,
    storedFileName: 'PENDING',
    ocrStatus: 'UPLOADED',
    createdById: createdById ?? null
  });

  let storedFile = null;

  try {
    // STEP 2: Simpan file PDF ke disk
    storedFile = await fileStorageService.storePdf({
      id: sb.id,
      checksum,
      originalFileName,
      buffer
    });

    // Update status ke PROCESSING
    await serviceBulletinRepository.updateServiceBulletin(sb.id, {
      storedFileName: storedFile.storedFileName,
      ocrStatus: 'PROCESSING'
    });

    // STEP 3: Panggil AI service
    let aiResult;
    let finalSb = null;
    let aiError = null;

    try {
      aiResult = await ocrClient.analyzePdf({
        fileName: originalFileName,
        checksum,
        buffer,
        storagePath: storedFile.storagePath
      });

      // STEP 4: Normalisasi payload AI
      const normalized = normalizeOcrPayload(aiResult.payload);

      // STEP 5: Periksa apakah SB asli sudah ada di DB
      const existingSb = await serviceBulletinRepository.findServiceBulletinBySbNumber(normalized.bulletinNumber);

      if (existingSb) {
        // Jika SB asli sudah ada, update record yang ada dengan file baru & draft payload
        // dan hapus temp SB record agar DB tidak kotor
        finalSb = await serviceBulletinRepository.updateServiceBulletin(existingSb.id, {
          originalFileName,
          storedFileName: storedFile.storedFileName,
          
          // Map AI extracted payload to root SB fields if they are available
          complianceCategory: aiResult.payload.compliance_category ? parseInt(aiResult.payload.compliance_category) : existingSb.complianceCategory,
          effectivityType: aiResult.payload.effected_type || existingSb.effectivityType,
          effectivityRange: Array.isArray(aiResult.payload.effected_model) 
                              ? aiResult.payload.effected_model.join(', ') 
                              : (aiResult.payload.effected_model || existingSb.effectivityRange),
                              
          ocrStatus: 'EXTRACTED',
          draftStatus: 'REVIEW_REQUIRED',
          rawPayload: aiResult.payload,
          extractedAt: new Date(),
          createdById: createdById ?? existingSb.createdById
        });

        // Hapus temp record
        await serviceBulletinRepository.deleteServiceBulletinById(sb.id);
        console.log(`[OCR Service] Merged uploaded PDF into existing ServiceBulletin: ${normalized.bulletinNumber}`);
      } else {
        // Jika SB asli belum ada, update temp record menjadi SB asli sesungguhnya
        finalSb = await serviceBulletinRepository.updateServiceBulletin(sb.id, {
          sbNumber: normalized.bulletinNumber,
          title: aiResult.payload.title || `Service Bulletin ${normalized.bulletinNumber}`,
          issuer: aiResult.payload.issuer || aiResult.payload.effected_type || 'Unknown Issuer',
          issueDate: aiResult.payload.issueDate ? new Date(aiResult.payload.issueDate) : new Date(),
          
          // Map AI extracted payload to root SB fields
          complianceCategory: aiResult.payload.compliance_category ? parseInt(aiResult.payload.compliance_category) : null,
          effectivityType: aiResult.payload.effected_type || null,
          effectivityRange: Array.isArray(aiResult.payload.effected_model) 
                              ? aiResult.payload.effected_model.join(', ') 
                              : (aiResult.payload.effected_model || null),
                              
          ocrStatus: 'EXTRACTED',
          draftStatus: 'REVIEW_REQUIRED',
          rawPayload: aiResult.payload,
          extractedAt: new Date()
        });
        console.log(`[OCR Service] Created new ServiceBulletin via AI detection: ${normalized.bulletinNumber}`);
      }

    } catch (aiErr) {
      console.error('[OCR Service] Gagal memproses AI response:', aiErr.message);
      
      // Jika AI gagal, update temp record agar statusnya REVIEW_REQUIRED
      finalSb = await serviceBulletinRepository.updateServiceBulletin(sb.id, {
        sbNumber: `FAILED-${sb.id}-${Date.now()}`,
        title: `Upload Failed: ${originalFileName}`,
        issuer: 'Unknown',
        ocrStatus: 'REVIEW_REQUIRED'
      });
      aiError = aiErr.message;
    }

    return {
      upload: finalSb,
      ai: aiResult
        ? {
            provider: aiResult.provider,
            confidence: aiResult.confidence,
            extractedAt: aiResult.extractedAt,
            note: aiResult.note
          }
        : null,
      warning: aiError || undefined
    };

  } catch (error) {
    // Jika gagal menyimpan file
    await serviceBulletinRepository.updateServiceBulletin(sb.id, {
      ocrStatus: 'FAILED'
    });
    throw error;
  }
};

/**
 * Lists SBs with pagination.
 */
const listServiceBulletins = async (query = {}) => {
  const pagination = parsePagination(query);
  const [items, total] = await Promise.all([
    serviceBulletinRepository.listServiceBulletins(pagination),
    serviceBulletinRepository.countServiceBulletins({
      ocrStatus: pagination.ocrStatus,
      draftStatus: pagination.draftStatus
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

/**
 * Gets a ServiceBulletin by ID.
 */
const getServiceBulletinById = async (id) => {
  const parsedId = validateStringId(id, 'Service Bulletin ID');
  const sb = await serviceBulletinRepository.findServiceBulletinById(parsedId);
  if (!sb) {
    throw new Error('Not Found: Service Bulletin does not exist');
  }
  return sb;
};

/**
 * Updates a ServiceBulletin metadata, ocrStatus, or draft.
 */
const updateServiceBulletin = async (id, data, updatedById = null) => {
  const sb = await getServiceBulletinById(id);
  const updates = {};

  if (updatedById) {
    updates.updatedById = updatedById;
  }

  const incomingFileName = data.originalFileName !== undefined ? data.originalFileName : data.originalName;
  if (incomingFileName !== undefined) {
    updates.originalFileName = normalizeFileName(incomingFileName);
  }

  if (data.ocrStatus !== undefined || data.status !== undefined) {
    let ocrStatusToUpdate = data.ocrStatus || data.status;
    if (ocrStatusToUpdate === 'PENDING') ocrStatusToUpdate = 'UPLOADED';
    if (ocrStatusToUpdate === 'PROCESSED') ocrStatusToUpdate = 'EXTRACTED';

    const allowedOcrStatuses = ['UPLOADED', 'PROCESSING', 'EXTRACTED', 'REVIEW_REQUIRED', 'FAILED'];
    if (allowedOcrStatuses.includes(ocrStatusToUpdate)) {
      updates.ocrStatus = ocrStatusToUpdate;
    }
  }

  if (data.extractedPayload !== undefined) {
    assertPayloadShape(data.extractedPayload);
    updates.rawPayload = data.extractedPayload;
    updates.draftStatus = 'REVIEW_REQUIRED';
  }

  if (data.validatedPayload !== undefined) {
    assertPayloadShape(data.validatedPayload);
    updates.rawPayload = data.validatedPayload;
    updates.draftStatus = 'VALIDATED';
  }

  if (data.draftStatus !== undefined) {
    const allowedDraftStatuses = ['DRAFT', 'REVIEW_REQUIRED', 'VALIDATED', 'GENERATED'];
    if (!allowedDraftStatuses.includes(data.draftStatus)) {
      throw new Error('Validation Error: invalid draft status');
    }
    updates.draftStatus = data.draftStatus;
  }

  if (Object.keys(updates).length === 0) {
    return sb;
  }

  return serviceBulletinRepository.updateServiceBulletin(sb.id, updates);
};

/**
 * Validates the draft results.
 */
const validateServiceBulletin = async (id, validatedPayload, updatedById = null) => {
  const sb = await getServiceBulletinById(id);
  const payload = validatedPayload || sb.ocrResult?.rawPayload || {
    bulletinNumber: sb.sbNumber,
    title: sb.title,
    issuer: sb.issuer,
    evaluations: []
  };
  
  if (!payload || typeof payload !== 'object') {
    throw new Error('Validation Error: cannot validate an empty payload');
  }
  assertPayloadShape(payload);

  return serviceBulletinRepository.updateServiceBulletin(sb.id, {
    sbNumber: payload.bulletinNumber || payload.sb_code || payload.sbNumber || sb.sbNumber,
    title: payload.title || payload.tittle || sb.title,
    issuer: payload.issuer || payload.manufacturer || payload.effected_type || sb.issuer,
    complianceCategory: payload.compliance_category !== undefined && payload.compliance_category !== null ? parseInt(payload.compliance_category) : sb.complianceCategory,
    effectivityType: payload.effected_type || sb.effectivityType,
    effectivityRange: Array.isArray(payload.effected_model) 
                        ? payload.effected_model.join(', ') 
                        : (payload.effected_model || sb.effectivityRange),
    compliancePeriod: payload.compliance_period || sb.compliancePeriod,
    rawPayload: payload,
    draftStatus: 'VALIDATED',
    updatedById: updatedById || undefined
  });
};

/**
 * Generates EesDocument from validated draft.
 */
const generateEes = async (id, updatedById = null, customData = {}) => {
  const sb = await getServiceBulletinById(id);

  if (sb.ocrResult?.draftStatus === 'GENERATED' && sb.generatedEes) {
    return sb;
  }

  const payload = sb.ocrResult?.rawPayload || {
    bulletinNumber: sb.sbNumber,
    title: sb.title,
    issuer: sb.issuer,
    evaluations: []
  };

  if (customData.eesNumber) payload.eesNumber = customData.eesNumber;
  if (customData.aircraftType) {
    const prisma = require('../db');
    const validAircraft = await prisma.aircraft.findFirst({
      where: { aircraftType: customData.aircraftType }
    });
    if (!validAircraft) {
      throw new Error(`Validation Error: Aircraft type '${customData.aircraftType}' is not registered in the system. Please choose a valid aircraft type.`);
    }
    payload.aircraftType = customData.aircraftType;
  }

  if (!payload || typeof payload !== 'object') {
    throw new Error('Validation Error: cannot generate EES from empty OCR payload');
  }
  assertPayloadShape(payload);

  const eesDoc = await eesService.processEesWebhook(payload, sb.id);

  try {
    // Kita tidak men-generate dan menyimpan file PDF secara permanen ke disk
    // untuk menghemat ruang penyimpanan. PDF (baik Garuda maupun Citilink)
    // akan di-generate secara live (on-the-fly) saat user menekan tombol export/download.
  } catch (error) {
    console.error('Error in generateEes:', error);
  }

  return serviceBulletinRepository.updateServiceBulletin(sb.id, {
    draftStatus: 'GENERATED',
    updatedById: updatedById || undefined
  });
};

/**
 * Deletes a ServiceBulletin and its files.
 */
const deleteServiceBulletin = async (id) => {
  const sb = await getServiceBulletinById(id);

  if (sb.storedFileName && sb.storedFileName !== 'PENDING') {
    const storagePath = path.join(fileStorageService.STORAGE_ROOT, sb.storedFileName);
    await fileStorageService.deleteFileIfExists(storagePath);
  }

  return serviceBulletinRepository.deleteServiceBulletinById(sb.id);
};

/**
 * Retrieve pdf file for download/preview.
 */
const getServiceBulletinFile = async (id) => {
  const sb = await getServiceBulletinById(id);

  if (!sb.storedFileName || sb.storedFileName === 'PENDING' || sb.ocrResult?.ocrStatus === 'FAILED') {
    throw new Error('Not Found: uploaded PDF file is not available yet');
  }

  const storagePath = path.join(fileStorageService.STORAGE_ROOT, sb.storedFileName);

  return {
    upload: sb,
    storagePath,
    fileName: sb.originalFileName,
    mimeType: 'application/pdf'
  };
};

module.exports = {
  processPdf,
  listServiceBulletins,
  getServiceBulletinById,
  updateServiceBulletin,
  validateServiceBulletin,
  generateEes,
  deleteServiceBulletin,
  getServiceBulletinFile,
  triggerAiAnalysis,
};

/**
 * Trigger AI analysis for an already-uploaded SB PDF (Step 3).
 * Reads the stored file, sends to AI, saves the result to rawPayload.
 */
async function triggerAiAnalysis(sbId, updatedById = null) {
  const sb = await getServiceBulletinById(sbId);
  if (!sb.storedFileName) {
    throw new Error('Validation Error: No PDF file stored for this SB');
  }

  const storagePath = fileStorageService.storePdf
    ? require('path').join(fileStorageService.STORAGE_ROOT, sb.storedFileName)
    : null;

  if (!storagePath || !require('fs').existsSync(storagePath)) {
    throw new Error('Validation Error: Stored PDF file not found on disk');
  }

  const buffer = require('fs').readFileSync(storagePath);
  const ocrClient = require('../clients/ocrClient');
  const aiResult = await ocrClient.analyzeDocument(buffer, sb.originalFileName || sb.sbNumber);

  return serviceBulletinRepository.updateServiceBulletin(sb.id, {
    rawPayload: aiResult,
    ocrStatus: 'REVIEW_REQUIRED',
    draftStatus: 'REVIEW_REQUIRED',
    extractedAt: new Date(),
    updatedById: updatedById || undefined,
  });
}
