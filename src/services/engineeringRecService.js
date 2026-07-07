const engineeringRecRepository = require('../repositories/engineeringRecRepository');
const serviceBulletinRepository = require('../repositories/serviceBulletinRepository');

const VALID_ACTIONS = ['COMPLY', 'DEFER', 'NA'];
const VALID_PRIORITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

/**
 * Saves or updates an Engineering Recommendation for a given SB ID.
 */
const saveEngineeringRec = async (sbId, data, userId) => {
  // Validate SB exists
  const sb = await serviceBulletinRepository.findServiceBulletinById(sbId);
  if (!sb) {
    throw new Error(`Not Found: ServiceBulletin with id '${sbId}' not found`);
  }

  // Validate required fields
  if (!data.recommendedAction || !VALID_ACTIONS.includes(data.recommendedAction)) {
    throw new Error(`Validation Error: recommendedAction must be one of: ${VALID_ACTIONS.join(', ')}`);
  }
  if (data.priorityLevel && !VALID_PRIORITIES.includes(data.priorityLevel)) {
    throw new Error(`Validation Error: priorityLevel must be one of: ${VALID_PRIORITIES.join(', ')}`);
  }

  const recData = {
    recommendedAction: data.recommendedAction,
    priorityLevel: data.priorityLevel || 'HIGH',
    engineeringNotes: data.engineeringNotes || null,
    isDeferable: data.isDeferable === true,
    egtMarginCheck: data.egtMarginCheck === true,
  };

  return engineeringRecRepository.upsertEngineeringRec(sbId, recData, userId);
};

/**
 * Retrieves the Engineering Recommendation for an SB.
 */
const getEngineeringRec = async (sbId) => {
  const sb = await serviceBulletinRepository.findServiceBulletinById(sbId);
  if (!sb) {
    throw new Error(`Not Found: ServiceBulletin with id '${sbId}' not found`);
  }

  return engineeringRecRepository.findEngineeringRecBySbId(sbId);
};

module.exports = {
  saveEngineeringRec,
  getEngineeringRec,
};
