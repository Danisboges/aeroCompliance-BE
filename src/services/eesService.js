const eesRepository = require('../repositories/eesRepository');

/**
 * Validates and processes the EES webhook payload.
 * 
 * @param {Object} payload - The raw request payload from the AI.
 * @returns {Promise<Object>} The successfully created record structure.
 */
const processEesWebhook = async (payload) => {
  const { eesNumber, bulletinNumber, evaluations } = payload;

  // Basic validation checks
  if (!eesNumber || !bulletinNumber) {
    throw new Error('Validation Error: eesNumber and bulletinNumber are required');
  }

  if (!Array.isArray(evaluations)) {
    throw new Error('Validation Error: evaluations must be an array of items');
  }

  // Pass to repository for atomic database storage
  return await eesRepository.createEesDocument({ eesNumber, bulletinNumber }, evaluations);
};

module.exports = {
  processEesWebhook
};
