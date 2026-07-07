const prisma = require('../db');
const { generateId } = require('../utils/idGenerator');

const includeRelations = {
  createdBy: {
    select: { id: true, email: true, username: true, role: true }
  },
  updatedBy: {
    select: { id: true, email: true, username: true, role: true }
  },
  generatedEes: {
    include: { evaluations: true }
  },
  engineeringRec: true
};

/**
 * Creates a new ServiceBulletin record.
 */
const createServiceBulletin = async (data) => {
  return prisma.serviceBulletin.create({
    data: {
      id: generateId('SB-DOC'),
      ...data
    },
    include: includeRelations
  });
};

/**
 * Updates an existing ServiceBulletin record.
 */
const updateServiceBulletin = async (id, data) => {
  return prisma.serviceBulletin.update({
    where: { id },
    data,
    include: includeRelations
  });
};

/**
 * Lists ServiceBulletins based on filters.
 */
const listServiceBulletins = async ({ skip = 0, take = 20, ocrStatus, draftStatus } = {}) => {
  return prisma.serviceBulletin.findMany({
    where: {
      ...(ocrStatus ? { ocrStatus } : {}),
      ...(draftStatus ? { draftStatus } : {})
    },
    skip: parseInt(skip, 10),
    take: parseInt(take, 10),
    orderBy: {
      createdAt: 'desc'
    },
    include: includeRelations
  });
};

/**
 * Counts ServiceBulletins based on filters.
 */
const countServiceBulletins = async ({ ocrStatus, draftStatus } = {}) => {
  return prisma.serviceBulletin.count({
    where: {
      ...(ocrStatus ? { ocrStatus } : {}),
      ...(draftStatus ? { draftStatus } : {})
    }
  });
};

/**
 * Finds a unique ServiceBulletin by its database ID.
 */
const findServiceBulletinById = async (id) => {
  return prisma.serviceBulletin.findUnique({
    where: { id },
    include: includeRelations
  });
};

/**
 * Finds a unique ServiceBulletin by its SB number.
 */
const findServiceBulletinBySbNumber = async (sbNumber) => {
  return prisma.serviceBulletin.findUnique({
    where: { sbNumber },
    include: includeRelations
  });
};

/**
 * Deletes a ServiceBulletin by database ID.
 */
const deleteServiceBulletinById = async (id) => {
  return prisma.serviceBulletin.delete({
    where: { id }
  });
};

module.exports = {
  createServiceBulletin,
  updateServiceBulletin,
  listServiceBulletins,
  countServiceBulletins,
  findServiceBulletinById,
  findServiceBulletinBySbNumber,
  deleteServiceBulletinById,
  findAllWithFilter,
  checkApplicabilityForSb,
};

/**
 * Lists all SBs with optional text search and type/status filters (for Select SB step).
 */
async function findAllWithFilter({ search, sbType, status } = {}) {
  const where = {};
  if (search) {
    where.OR = [
      { sbNumber: { contains: search, mode: 'insensitive' } },
      { title: { contains: search, mode: 'insensitive' } },
      { effectivityType: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (sbType) where.sbType = sbType;
  if (status) where.status = status;

  return prisma.serviceBulletin.findMany({
    where,
    orderBy: { issueDate: 'desc' },
    include: includeRelations,
  });
}

/**
 * Checks applicability of all active fleet engines against an SB's effectivity rules.
 * Returns a list of engines annotated with { isApplicable, reason }.
 */
async function checkApplicabilityForSb(sb) {
  const allEngines = await prisma.engine.findMany({
    where: { active: true },
    include: { aircraft: true },
  });

  return allEngines.map((engine) => {
    // Rule 1: Engine model must match SB effectivityType
    const modelMatch = sb.effectivityType
      ? engine.model.toLowerCase().includes(sb.effectivityType.toLowerCase()) ||
        sb.effectivityType.toLowerCase().includes(engine.model.split('-')[0].toLowerCase())
      : false;

    // Rule 2: ESN range check — e.g. "ESN below 882000"
    let esnInRange = true;
    if (sb.effectivityRange && sb.effectivityRange.toLowerCase().includes('esn below')) {
      const match = sb.effectivityRange.match(/esn below (\d+)/i);
      if (match) {
        const limit = parseInt(match[1], 10);
        const esnNum = parseInt(engine.esn.replace(/\D/g, ''), 10);
        esnInRange = !isNaN(esnNum) && esnNum < limit;
      }
    }

    const isApplicable = modelMatch && esnInRange;
    const reason = !modelMatch
      ? 'Different engine type'
      : !esnInRange
      ? 'ESN outside effectivity range'
      : 'Within effectivity range';

    return { engine, aircraft: engine.aircraft, isApplicable, reason };
  });
}
