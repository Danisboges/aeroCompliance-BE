const fs = require('fs');
const edsService = require('../services/edsService');

const sanitizeDownloadName = (fileName) => (
  String(fileName || 'eds-document.pdf').replace(/[\r\n"]/g, '_')
);

const listEds = async (req, res) => {
  try {
    const result = await edsService.listEngineDataSubmittals(req.query);
    return res.status(200).json({
      data: result.items,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Error listing EDS:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

const getEdsById = async (req, res) => {
  try {
    const eds = await edsService.getEngineDataSubmittalById(req.params.id);
    return res.status(200).json({ data: eds });
  } catch (error) {
    console.error('Error getting EDS by ID:', error);
    if (error.message.startsWith('Not Found')) {
      return res.status(404).json({ error: error.message });
    }
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

const viewEdsPdf = async (req, res) => {
  try {
    const { storagePath, fileName, mimeType } = await edsService.getedsFile(req.params.id);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${sanitizeDownloadName(fileName)}"`);
    return fs.createReadStream(storagePath).pipe(res);
  } catch (error) {
    console.error('Error viewing EDS PDF:', error);
    if (error.message.startsWith('Not Found')) {
      return res.status(404).json({ error: error.message });
    }
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

const downloadEdsPdf = async (req, res) => {
  try {
    const { storagePath, fileName, mimeType } = await edsService.getedsFile(req.params.id);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${sanitizeDownloadName(fileName)}"`);
    return fs.createReadStream(storagePath).pipe(res);
  } catch (error) {
    console.error('Error downloading EDS PDF:', error);
    if (error.message.startsWith('Not Found')) {
      return res.status(404).json({ error: error.message });
    }
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

module.exports = {
  listEds,
  getEdsById,
  viewEdsPdf,
  downloadEdsPdf
};
