const fs = require('fs');
const svrService = require('../services/svrService');
const svrRepository = require('../repositories/svrRepository');

const handleControllerError = (res, error) => {
  if (error.message.startsWith('Validation Error')) {
    return res.status(400).json({ error: error.message });
  }
  if (error.message.startsWith('Not Found')) {
    return res.status(404).json({ error: error.message });
  }
  console.error('[SVR Controller]', error);
  return res.status(500).json({
    error: 'Internal Server Error',
    details: error.message
  });
};

/**
 * POST /api/shop-visit-reports/upload/:docType
 * Upload Engine PDF document (SVR, EDS, IQ03).
 */
const uploadEngineDocPdf = async (req, res) => {
  try {
    const docType = (req.params.docType || 'SVR').toUpperCase();
    const validTypes = ['SVR', 'EDS', 'IQ03'];
    if (!validTypes.includes(docType)) {
      return res.status(400).json({ error: `Validation Error: Invalid docType '${docType}'. Must be one of SVR, EDS, or IQ03.` });
    }

    const fileName = req.headers['x-file-name'] || `${docType.toLowerCase()}-upload.pdf`;
    let result;

    if (docType === 'EDS') {
      const edsService = require('../services/edsService');
      result = await edsService.processEdsPdf({ buffer: req.body, fileName, docType });
    } else if (docType === 'IQ03') {
      const iq03Service = require('../services/iq03Service');
      result = await iq03Service.processIq03Pdf({ buffer: req.body, fileName, docType });
    } else {
      result = await svrService.processSvrPdf({ buffer: req.body, fileName, docType });
    }

    return res.status(201).json({
      message: `${docType} PDF received and processed by pipeline`,
      data: result
    });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

/**
 * POST /api/webhooks/svr
 * Webhook that directly ingests raw JSON extracted from SVR document.
 */
const uploadSvrJson = async (req, res) => {
  try {
    const result = await svrService.processSvrJson(
      req.body,
      req.headers['x-file-name'] || 'ingested-payload.json'
    );
    return res.status(201).json({
      message: 'SVR JSON ingested successfully',
      data: result
    });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

/**
 * POST /api/webhooks/eds
 * Webhook that directly ingests raw JSON extracted from EDS document.
 */
const uploadEdsJson = async (req, res) => {
  try {
    const edsService = require('../services/edsService');
    const result = await edsService.processEdsJson(
      req.body,
      req.headers['x-file-name'] || 'eds-ingested-payload.json',
      'PENDING',
      'EDS'
    );
    return res.status(201).json({
      message: 'EDS JSON ingested successfully',
      data: result
    });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

/**
 * POST /api/webhooks/iq03
 * Webhook that directly ingests raw JSON extracted from IQ03 document.
 */
const uploadIq03Json = async (req, res) => {
  try {
    const iq03Service = require('../services/iq03Service');
    const result = await iq03Service.processIq03Json(
      req.body,
      req.headers['x-file-name'] || 'iq03-ingested-payload.json',
      'PENDING',
      'IQ03'
    );
    return res.status(201).json({
      message: 'IQ03 JSON ingested successfully',
      data: result
    });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

/**
 * GET /api/shop-visit-reports
 * List all SVR records with pagination and filters.
 */
const listShopVisitReports = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;
    const esn = req.query.esn || null;

    const items = await svrRepository.listShopVisitReports({ skip, take: limit, esn });
    const total = await svrRepository.countShopVisitReports({ esn });

    return res.status(200).json({
      data: items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

/**
 * GET /api/shop-visit-reports/:id
 * Retrieve details of a single SVR record.
 */
const getShopVisitReport = async (req, res) => {
  try {
    const result = await svrRepository.findShopVisitReportById(req.params.id);
    if (!result) {
      return res.status(404).json({ error: `Not Found: ShopVisitReport with id '${req.params.id}' not found` });
    }
    return res.status(200).json({ data: result });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

/**
 * GET /api/shop-visit-reports/:id/view
 * Preview SVR PDF document.
 */
const viewSvrPdf = async (req, res) => {
  try {
    const { storagePath, fileName, mimeType } = await svrService.getSvrFile(req.params.id);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
    return fs.createReadStream(storagePath).pipe(res);
  } catch (error) {
    return handleControllerError(res, error);
  }
};

/**
 * GET /api/shop-visit-reports/:id/download
 * Download SVR PDF document.
 */
const downloadSvrPdf = async (req, res) => {
  try {
    const { storagePath, fileName, mimeType } = await svrService.getSvrFile(req.params.id);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    return fs.createReadStream(storagePath).pipe(res);
  } catch (error) {
    return handleControllerError(res, error);
  }
};

/**
 * DELETE /api/shop-visit-reports/:id
 * Delete a single SVR record and its local PDF file.
 */
const deleteShopVisitReport = async (req, res) => {
  try {
    const svr = await svrRepository.findShopVisitReportById(req.params.id);
    if (!svr) {
      return res.status(200).json({
        message: 'ShopVisitReport already deleted or does not exist',
        data: null
      });
    }

    // Delete PDF file from disk
    if (svr.storedFileName && svr.storedFileName !== 'PENDING') {
      const storagePath = path.join(path.resolve(__dirname, '../../uploads/svr-documents'), svr.storedFileName);
      if (fs.existsSync(storagePath)) {
        fs.unlinkSync(storagePath);
      }
    }

    const result = await svrRepository.deleteShopVisitReport(req.params.id);
    return res.status(200).json({
      message: 'ShopVisitReport deleted successfully',
      data: result
    });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

module.exports = {
  uploadEngineDocPdf,
  uploadSvrJson,
  uploadEdsJson,
  uploadIq03Json,
  listShopVisitReports,
  getShopVisitReport,
  viewSvrPdf,
  downloadSvrPdf,
  deleteShopVisitReport
};
