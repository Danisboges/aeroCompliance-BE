const prisma = require('../db');
const { generateId } = require('../utils/idGenerator');

/**
 * Creates or replaces an Engineering Recommendation for an SB.
 */
const upsertEngineeringRec = async (sbId, data, userId) => {
  return prisma.engineeringRecommendation.upsert({
    where: { sbId },
    update: {
      ...data,
      updatedAt: new Date(),
    },
    create: {
      id: generateId('ENG-REC'),
      sbId,
      createdById: userId || null,
      ...data,
    },
    include: {
      sb: { select: { id: true, sbNumber: true, title: true } },
      createdBy: { select: { id: true, username: true, email: true } },
    }
  });
};

/**
 * Gets the Engineering Recommendation for an SB.
 */
const findEngineeringRecBySbId = async (sbId) => {
  return prisma.engineeringRecommendation.findUnique({
    where: { sbId },
    include: {
      sb: { select: { id: true, sbNumber: true, title: true } },
      createdBy: { select: { id: true, username: true, email: true } },
    }
  });
};

module.exports = {
  upsertEngineeringRec,
  findEngineeringRecBySbId,
};
