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
  ocrResult: true,
  engineeringRec: true
};

const listSelect = {
  id: true,
  sbNumber: true,
  revision: true,
  title: true,
  issuer: true,
  issueDate: true,
  receivedAt: true,
  status: true,
  complianceCategory: true,
  impactType: true,
  aircraftType: true,
  effectivityType: true,
  operatorId: true,
  ocrResult: { select: { ocrStatus: true, draftStatus: true } },
  generatedEes: { select: { id: true, eesNumber: true, reviewStatus: true, createdAt: true } }
};

/**
 * Creates a new ServiceBulletin record.
 */
const createServiceBulletin = async (data) => {
  const { ocrStatus, draftStatus, rawPayload, extractedAt, ...sbData } = data;
  return prisma.serviceBulletin.create({
    data: {
      id: generateId('SB-DOC'),
      ...sbData,
      ocrResult: {
        create: {
          ...(ocrStatus !== undefined && { ocrStatus }),
          ...(draftStatus !== undefined && { draftStatus }),
          ...(rawPayload !== undefined && { rawPayload }),
          ...(extractedAt !== undefined && { extractedAt })
        }
      }
    },
    include: includeRelations
  });
};

/**
 * Updates an existing ServiceBulletin record.
 */
const updateServiceBulletin = async (id, data) => {
  const { ocrStatus, draftStatus, rawPayload, extractedAt, ...sbData } = data;
  const ocrUpdates = {};
  if (ocrStatus !== undefined) ocrUpdates.ocrStatus = ocrStatus;
  if (draftStatus !== undefined) ocrUpdates.draftStatus = draftStatus;
  if (rawPayload !== undefined) ocrUpdates.rawPayload = rawPayload;
  if (extractedAt !== undefined) ocrUpdates.extractedAt = extractedAt;

  return prisma.serviceBulletin.update({
    where: { id },
    data: {
      ...sbData,
      ...(Object.keys(ocrUpdates).length > 0 && {
        ocrResult: {
          upsert: {
            create: ocrUpdates,
            update: ocrUpdates
          }
        }
      })
    },
    include: includeRelations
  });
};

/**
 * Lists ServiceBulletins based on filters.
 */
const listServiceBulletins = async ({ skip = 0, take = 20, ocrStatus, draftStatus } = {}) => {
  const where = {};
  if (ocrStatus || draftStatus) {
    where.ocrResult = {};
    if (ocrStatus) where.ocrResult.ocrStatus = ocrStatus;
    if (draftStatus) where.ocrResult.draftStatus = draftStatus;
  }
  return prisma.serviceBulletin.findMany({
    where,
    skip: parseInt(skip, 10),
    take: parseInt(take, 10),
    orderBy: {
      createdAt: 'desc'
    },
    select: listSelect
  });
};

/**
 * Counts ServiceBulletins based on filters.
 */
const countServiceBulletins = async ({ ocrStatus, draftStatus } = {}) => {
  const where = {};
  if (ocrStatus || draftStatus) {
    where.ocrResult = {};
    if (ocrStatus) where.ocrResult.ocrStatus = ocrStatus;
    if (draftStatus) where.ocrResult.draftStatus = draftStatus;
  }
  return prisma.serviceBulletin.count({
    where
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
  countAllWithFilter,
  checkApplicabilityForSb,
  markServiceBulletinAsRead,
};

const { notifyUser } = require('../socket');

/**
 * Marks a ServiceBulletin as read by a user.
 */
async function markServiceBulletinAsRead(sbId, userId) {
  const result = await prisma.serviceBulletinRead.upsert({
    where: {
      userId_serviceBulletinId: {
        userId,
        serviceBulletinId: sbId
      }
    },
    update: { readAt: new Date() },
    create: {
      userId,
      serviceBulletinId: sbId,
      readAt: new Date()
    }
  });

  // Notify the user via WebSocket that their dashboard (unread count) has updated
  notifyUser(userId, 'dashboard_updated', { trigger: 'sb_read' });

  return result;
}

/**
 * Lists all SBs with optional text search and type/status filters (for Select SB step).
 * Supports pagination, operator filter, and date ranges.
 */
async function findAllWithFilter({ search, sbType, status, operatorId, receivedFrom, receivedTo, sortBy = 'receivedAt', sortOrder = 'desc', page, limit } = {}) {
  const where = _buildFilterWhere({ search, sbType, status, operatorId, receivedFrom, receivedTo });
  
  const queryOptions = {
    where,
    orderBy: { [sortBy]: sortOrder },
    select: listSelect,
  };

  if (page !== undefined && limit !== undefined) {
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    queryOptions.skip = (pageNum - 1) * limitNum;
    queryOptions.take = limitNum;
  } else if (limit !== undefined) {
    queryOptions.take = Math.min(100, Math.max(1, parseInt(limit, 10)));
  }

  return prisma.serviceBulletin.findMany(queryOptions);
}

/**
 * Counts all SBs with optional filters (for pagination).
 */
async function countAllWithFilter({ search, sbType, status, operatorId, receivedFrom, receivedTo } = {}) {
  const where = _buildFilterWhere({ search, sbType, status, operatorId, receivedFrom, receivedTo });
  return prisma.serviceBulletin.count({ where });
}

function _buildFilterWhere({ search, sbType, status, operatorId, receivedFrom, receivedTo }) {
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
  if (operatorId) where.operatorId = operatorId;
  
  if (receivedFrom || receivedTo) {
    where.receivedAt = {};
    if (receivedFrom) where.receivedAt.gte = new Date(receivedFrom);
    if (receivedTo) where.receivedAt.lte = new Date(receivedTo);
  }
  return where;
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
