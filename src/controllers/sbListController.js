/**
 * Controller for Service Bulletin listing and detail (Step 1: Select SB)
 */
const serviceBulletinRepository = require('../repositories/serviceBulletinRepository');

const handleControllerError = (res, error) => {
  if (error.message.startsWith('Not Found')) {
    return res.status(404).json({ error: error.message });
  }
  console.error('[SBController]', error);
  return res.status(500).json({ error: 'Internal Server Error', details: error.message });
};

/**
 * GET /api/service-bulletins
 * List all SBs with optional search and filters.
 */
const listServiceBulletins = async (req, res) => {
  try {
    const { search, sbType, status } = req.query;
    const results = await serviceBulletinRepository.findAllWithFilter({ search, sbType, status });
    return res.status(200).json({ data: results, total: results.length });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

/**
 * GET /api/service-bulletins/:id
 * Get detail of a single SB.
 */
const getServiceBulletin = async (req, res) => {
  try {
    const sb = await serviceBulletinRepository.findServiceBulletinById(req.params.id);
    if (!sb) {
      return res.status(404).json({ error: 'Not Found: ServiceBulletin not found' });
    }
    return res.status(200).json({ data: sb });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

module.exports = { listServiceBulletins, getServiceBulletin };
