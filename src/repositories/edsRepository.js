const prisma = require('../db');

const includeRelations = {
  engine: true,
  configurationReport: true,
  llpStatus: true,
  adStatus: true,
  complianceRecords: {
    include: {
      sb: true,
      ad: true
    }
  }
};

/**
 * Creates a new EngineDataSheet record along with its child relations.
 */
const createEngineDataSheet = async (data) => {
  const { configurationReport, llpStatus, adStatus, ...headerData } = data;
  
  // Find associated Engine in database by ESN (Engine Serial Number)
  let engineId = null;
  if (headerData.engineSerialNumber) {
    const engine = await prisma.engine.findFirst({
      where: { esn: headerData.engineSerialNumber }
    });
    if (engine) engineId = engine.id;
  }

  const mappedConfigs = (configurationReport || []).map(item => ({
    ...item,
    engineId,
    engineSerialNumber: headerData.engineSerialNumber
  }));

  const mappedLlps = (llpStatus || []).map(item => ({
    ...item,
    engineId,
    engineSerialNumber: headerData.engineSerialNumber
  }));

  const mappedAds = (adStatus || []).map(item => ({
    ...item,
    engineId,
    engineSerialNumber: headerData.engineSerialNumber
  }));

  return prisma.EngineDataSheet.create({
    data: {
      ...headerData,
      engineId,
      configurationReport: {
        create: mappedConfigs
      },
      llpStatus: {
        create: mappedLlps
      },
      adStatus: {
        create: mappedAds
      }
    },
    include: includeRelations
  });
};

/**
 * Retrieves a EngineDataSheet by ID.
 */
const findEngineDataSheetById = async (id) => {
  return prisma.EngineDataSheet.findUnique({
    where: { id },
    include: includeRelations
  });
};

/**
 * Lists EngineDataSheets with filter and pagination.
 */
const listEngineDataSheets = async ({ skip = 0, take = 20, esn } = {}) => {
  const where = {};
  if (esn) {
    where.engineSerialNumber = esn;
  }
  return prisma.EngineDataSheet.findMany({
    where,
    skip: parseInt(skip, 10),
    take: parseInt(take, 10),
    orderBy: {
      createdAt: 'desc'
    },
    include: includeRelations
  });
};

/**
 * Counts EngineDataSheets matching filters.
 */
const countEngineDataSheets = async ({ esn } = {}) => {
  const where = {};
  if (esn) {
    where.engineSerialNumber = esn;
  }
  return prisma.EngineDataSheet.count({ where });
};

/**
 * Deletes a EngineDataSheet record.
 */
const deleteEngineDataSheet = async (id) => {
  return prisma.EngineDataSheet.delete({
    where: { id },
    include: includeRelations
  });
};

module.exports = {
  createEngineDataSheet,
  findEngineDataSheetById,
  listEngineDataSheets,
  countEngineDataSheets,
  deleteEngineDataSheet
};

