const crypto = require('crypto');
const fileStorageService = require('./fileStorageService');
const ocrDocumentRepository = require('../repositories/ocrDocumentRepository');

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

const processPdf = async ({ buffer, fileName, mimeType = 'application/pdf', createdById = null }) => {
  assertPdfBuffer(buffer);

  const originalFileName = normalizeFileName(fileName);
  const checksum = crypto.createHash('sha256').update(buffer).digest('hex');

  const upload = await ocrDocumentRepository.createUpload({
    originalFileName,
    storedFileName: 'PENDING',
    storagePath: 'PENDING',
    fileUrl: 'PENDING',
    mimeType,
    fileSize: buffer.length,
    checksum,
    status: 'UPLOADED',
    createdById
  });

  try {
    const storedFile = await fileStorageService.storePdf({
      id: upload.id,
      checksum,
      originalFileName,
      buffer
    });

    return await ocrDocumentRepository.updateUpload(upload.id, {
      status: 'UPLOADED',
      storedFileName: storedFile.storedFileName,
      storagePath: storedFile.storagePath,
      fileUrl: storedFile.fileUrl
    });
  } catch (error) {
    await ocrDocumentRepository.updateUpload(upload.id, {
      status: 'FAILED',
      errorMessage: error.message
    });

    throw error;
  }
};

const parsePagination = ({ page = 1, limit = 20, status } = {}) => {
  const parsedPage = Math.max(Number(page) || 1, 1);
  const parsedLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);

  return {
    skip: (parsedPage - 1) * parsedLimit,
    take: parsedLimit,
    page: parsedPage,
    limit: parsedLimit,
    status
  };
};

const listUploads = async (query = {}) => {
  const pagination = parsePagination(query);
  const [items, total] = await Promise.all([
    ocrDocumentRepository.listUploads(pagination),
    ocrDocumentRepository.countUploads({ status: pagination.status })
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

const getUploadById = async (id) => {
  const parsedId = Number(id);
  if (!Number.isInteger(parsedId) || parsedId < 1) {
    throw new Error('Validation Error: upload id must be a positive integer');
  }

  const upload = await ocrDocumentRepository.findUploadById(parsedId);
  if (!upload) {
    throw new Error('Not Found: OCR upload does not exist');
  }

  return upload;
};

const updateUploadMetadata = async (id, data) => {
  const upload = await getUploadById(id);
  const allowedStatuses = ['UPLOADED', 'PROCESSING', 'EXTRACTED', 'REVIEW_REQUIRED', 'FAILED'];
  const updates = {};

  if (data.originalFileName !== undefined) {
    updates.originalFileName = normalizeFileName(data.originalFileName);
  }

  if (data.status !== undefined) {
    if (!allowedStatuses.includes(data.status)) {
      throw new Error('Validation Error: invalid OCR processing status');
    }
    updates.status = data.status;
  }

  if (data.errorMessage !== undefined) {
    updates.errorMessage = data.errorMessage || null;
  }

  if (Object.keys(updates).length === 0) {
    return upload;
  }

  return ocrDocumentRepository.updateUpload(upload.id, updates);
};

const getUploadFile = async (id) => {
  const upload = await getUploadById(id);

  if (!upload.storagePath || upload.storagePath === 'PENDING') {
    throw new Error('Not Found: uploaded PDF file is not available');
  }

  return {
    upload,
    storagePath: upload.storagePath,
    fileName: upload.originalFileName,
    mimeType: upload.mimeType
  };
};

const deleteUpload = async (id) => {
  const upload = await getUploadById(id);
  const deleted = await ocrDocumentRepository.deleteUploadById(upload.id);

  await fileStorageService.deleteFileIfExists(upload.storagePath);

  return deleted;
};

module.exports = {
  processPdf,
  listUploads,
  getUploadById,
  updateUploadMetadata,
  getUploadFile,
  deleteUpload
};
