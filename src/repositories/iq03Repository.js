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
 * Creates a new Iq03Report record along with its child relations.
 */
const createIq03Report = async (data) => {
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

  return prisma.Iq03Report.create({
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
 * Retrieves a Iq03Report by ID.
 */
const findIq03ReportById = async (id) => {
  return prisma.Iq03Report.findUnique({
    where: { id },
    include: includeRelations
  });
};

/**
 * Lists Iq03Reports with filter and pagination.
 */
const listIq03Reports = async ({ skip = 0, take = 20, esn } = {}) => {
  const where = {};
  if (esn) {
    where.engineSerialNumber = esn;
  }
  return prisma.Iq03Report.findMany({
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
 * Counts Iq03Reports matching filters.
 */
const countIq03Reports = async ({ esn } = {}) => {
  const where = {};
  if (esn) {
    where.engineSerialNumber = esn;
  }
  return prisma.Iq03Report.count({ where });
};

/**
 * Deletes a Iq03Report record.
 */
const deleteIq03Report = async (id) => {
  return prisma.Iq03Report.delete({
    where: { id },
    include: includeRelations
  });
};

module.exports = {
  createIq03Report,
  findIq03ReportById,
  listIq03Reports,
  countIq03Reports,
  deleteIq03Report
};

