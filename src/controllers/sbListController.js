/**
 * Controller for Service Bulletin listing and detail (Step 1: Select SB)
 */
const serviceBulletinRepository = require('../repositories/serviceBulletinRepository');

const handleControllerError = (res, error) => {
  if (error.message.startsWith('Not Found')) {
    return res.status(404).json({ error: error.message });
  }
  console.error('[SBController]', error);
  return res.status(500).json({ error: 'Internal Server Error' });
};

/**
 * GET /api/service-bulletins
 * List all SBs with optional search and filters.
 */
const listServiceBulletins = async (req, res) => {
  try {
    const { search, sbType, status, operatorId, receivedFrom, receivedTo, sortBy, sortOrder, page, limit } = req.query;
    const filters = { search, sbType, status, operatorId, receivedFrom, receivedTo, sortBy, sortOrder, page, limit };

    // Validasi & injeksi scope operator dari user login
    if (req.user && req.user.operatorId) {
      if (operatorId && operatorId !== req.user.operatorId) {
        return res.status(403).json({ error: 'Forbidden: Cannot access data outside your operator scope' });
      }
      filters.operatorId = req.user.operatorId;
    }

    const results = await serviceBulletinRepository.findAllWithFilter(filters);
    const total = await serviceBulletinRepository.countAllWithFilter(filters);
    
    return res.status(200).json({ 
      data: results, 
      total,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined
    });
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
