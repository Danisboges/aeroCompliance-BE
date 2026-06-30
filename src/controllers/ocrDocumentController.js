const ocrDocumentService = require('../services/ocrDocumentService');

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

const uploadPdf = async (req, res) => {
  try {
    const fileName = req.headers['x-file-name'];
    const result = await ocrDocumentService.processPdf({
      buffer: req.body,
      fileName,
      mimeType: req.headers['content-type'] || 'application/pdf',
      createdById: req.user?.id ?? null
    });

    return res.status(201).json({
      message: 'PDF received and processed by OCR pipeline',
      data: result
    });
  } catch (error) {
    console.error('Error processing PDF upload:', error);

    if (error.message.startsWith('Validation Error')) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(500).json({
      error: 'Internal Server Error',
      details: error.message
    });
  }
};

const uploadPdfBase64 = async (req, res) => {
  try {
    const { fileName, pdfBase64 } = req.body;

    if (!pdfBase64) {
      return res.status(400).json({ error: 'Validation Error: pdfBase64 is required' });
    }

    const result = await ocrDocumentService.processPdf({
      buffer: Buffer.from(pdfBase64, 'base64'),
      fileName,
      mimeType: 'application/pdf',
      createdById: req.user?.id ?? null
    });

    return res.status(201).json({
      message: 'Base64 PDF received and processed by OCR pipeline',
      data: result
    });
  } catch (error) {
    console.error('Error processing base64 PDF upload:', error);

    if (error.message.startsWith('Validation Error')) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(500).json({
      error: 'Internal Server Error',
      details: error.message
    });
  }
};

const listUploads = async (req, res) => {
  try {
    const result = await ocrDocumentService.listUploads(req.query);
    return res.status(200).json({ data: result.items, meta: result.meta });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

const getUpload = async (req, res) => {
  try {
    const result = await ocrDocumentService.getUploadById(req.params.id);
    return res.status(200).json({ data: result });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

const updateUpload = async (req, res) => {
  try {
    const result = await ocrDocumentService.updateUploadMetadata(req.params.id, req.body);
    return res.status(200).json({
      message: 'OCR upload metadata updated',
      data: result
    });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

const viewUploadFile = async (req, res) => {
  try {
    const result = await ocrDocumentService.getUploadFile(req.params.id);
    res.setHeader('Content-Type', result.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${result.fileName}"`);
    return res.sendFile(result.storagePath);
  } catch (error) {
    return handleControllerError(res, error);
  }
};

const downloadUploadFile = async (req, res) => {
  try {
    const result = await ocrDocumentService.getUploadFile(req.params.id);
    return res.download(result.storagePath, result.fileName);
  } catch (error) {
    return handleControllerError(res, error);
  }
};

const deleteUpload = async (req, res) => {
  try {
    const result = await ocrDocumentService.deleteUpload(req.params.id);
    return res.status(200).json({
      message: 'OCR upload deleted',
      data: result
    });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

module.exports = {
  listUploads,
  uploadPdf,
  uploadPdfBase64,
  getUpload,
  updateUpload,
  viewUploadFile,
  downloadUploadFile,
  deleteUpload
};
