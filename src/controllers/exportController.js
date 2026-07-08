const path = require('path');
const fs = require('fs');
const pdfGenerationService = require('../services/pdfGenerationService');
const excelGenerationService = require('../services/excelGenerationService');
const serviceBulletinRepository = require('../repositories/serviceBulletinRepository');
const { normalizeOcrPayload } = require('../services/eesService');

const handleControllerError = (res, error) => {
  if (error.message.startsWith('Validation Error')) {
    return res.status(400).json({ error: error.message });
  }
  if (error.message.startsWith('Not Found')) {
    return res.status(404).json({ error: error.message });
  }
  console.error('[ExportController]', error);
  return res.status(500).json({ error: 'Internal Server Error', details: error.message });
};

const getSbOrFail = async (id, res) => {
  const sb = await serviceBulletinRepository.findServiceBulletinById(id);
  if (!sb) {
    res.status(404).json({ error: 'Not Found: ServiceBulletin not found' });
    return null;
  }
  return sb;
};

/**
 * GET /api/service-bulletins/:id/export/garuda/pdf
 * Export EES as Garuda PDF — view inline.
 */
const exportGarudaPdf = async (req, res) => {
  try {
    const sb = await getSbOrFail(req.params.id, res);
    if (!sb) return;

    const pdfBuffer = await pdfGenerationService.generateEesPdf({ 
      sb, 
      templateType: 'GARUDA',
      evaluatorName: req.user?.username 
    });
    const eesNumber = sb.generatedEes?.eesNumber || `EES-${sb.sbNumber}`;
    const filename = `EES-${eesNumber}-GARUDA.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    return res.send(pdfBuffer);
  } catch (error) {
    return handleControllerError(res, error);
  }
};

/**
 * GET /api/service-bulletins/:id/export/garuda/pdf/download
 * Export EES as Garuda PDF — force download.
 */
const downloadGarudaPdf = async (req, res) => {
  try {
    const sb = await getSbOrFail(req.params.id, res);
    if (!sb) return;

    const pdfBuffer = await pdfGenerationService.generateEesPdf({ 
      sb, 
      templateType: 'GARUDA',
      evaluatorName: req.user?.username 
    });
    const eesNumber = sb.generatedEes?.eesNumber || `EES-${sb.sbNumber}`;
    const filename = `EES-${eesNumber}-GARUDA.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(pdfBuffer);
  } catch (error) {
    return handleControllerError(res, error);
  }
};

/**
 * GET /api/service-bulletins/:id/export/citilink/pdf
 * Export EES as Citilink PDF — view inline.
 */
const exportCitilinkPdf = async (req, res) => {
  try {
    const sb = await getSbOrFail(req.params.id, res);
    if (!sb) return;

    const pdfBuffer = await pdfGenerationService.generateEesPdf({ 
      sb, 
      templateType: 'CITILINK',
      evaluatorName: req.user?.username 
    });
    const eesNumber = sb.generatedEes?.eesNumber || `EES-${sb.sbNumber}`;
    const filename = `EES-${eesNumber}-CITILINK.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    return res.send(pdfBuffer);
  } catch (error) {
    return handleControllerError(res, error);
  }
};

/**
 * GET /api/service-bulletins/:id/export/citilink/pdf/download
 * Export EES as Citilink PDF — force download.
 */
const downloadCitilinkPdf = async (req, res) => {
  try {
    const sb = await getSbOrFail(req.params.id, res);
    if (!sb) return;

    const pdfBuffer = await pdfGenerationService.generateEesPdf({ 
      sb, 
      templateType: 'CITILINK',
      evaluatorName: req.user?.username 
    });
    const eesNumber = sb.generatedEes?.eesNumber || `EES-${sb.sbNumber}`;
    const filename = `EES-${eesNumber}-CITILINK.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(pdfBuffer);
  } catch (error) {
    return handleControllerError(res, error);
  }
};

/**
 * GET /api/service-bulletins/:id/export/excel
 * Export EES as Excel (.xlsx) — force download.
 */
const downloadExcel = async (req, res) => {
  try {
    const sb = await getSbOrFail(req.params.id, res);
    if (!sb) return;

    const applicabilityResults = await serviceBulletinRepository.checkApplicabilityForSb(sb);
    const applicableEsns = applicabilityResults
      .filter(r => r.isApplicable)
      .map(r => r.engine.esn)
      .join(', ');
    const dynamicEsnVal = applicableEsns || '-';

    const items = pdfGenerationService.extractPdfItems(sb, dynamicEsnVal);

    const norm = sb.rawPayload ? normalizeOcrPayload(sb.rawPayload) : {};
    const eesNumber = sb.generatedEes?.eesNumber || norm.eesNumber || `EES-${sb.sbNumber}`;
    const sbNumber = sb.sbNumber;

    const excelBuffer = await excelGenerationService.generateEesExcel({ sb, items, eesNumber, sbNumber });
    const filename = `EES-${eesNumber}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(excelBuffer);
  } catch (error) {
    return handleControllerError(res, error);
  }
};

module.exports = {
  exportGarudaPdf,
  downloadGarudaPdf,
  exportCitilinkPdf,
  downloadCitilinkPdf,
  downloadExcel
};
