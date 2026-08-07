const prisma = require('../db');

const includeRelations = {
  engine: true,
  configurationReport: true,
  llpStatus: true,
  sbStatus: true,
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
  const { configurationReport, llpStatus, sbStatus, adStatus, ...headerData } = data;
    // Find associated Engine in database by ESN (Engine Serial Number)
    let engineId = null;
    if (headerData.engineSerialNumber) {
      let engine = await prisma.engine.findFirst({
        where: { esn: headerData.engineSerialNumber }
      });
      if (!engine) {
        // Auto-create Engine if it doesn't exist
        engine = await prisma.engine.create({
          data: {
            id: `ENG-${headerData.engineSerialNumber}`,
            esn: headerData.engineSerialNumber,
            model: headerData.engineType || 'UNKNOWN'
          }
        });
      }
      engineId = engine.id;
    }

  const mappedConfigs = (configurationReport || []).map(item => ({
    ...item,
    engineSerialNumber: headerData.engineSerialNumber
  }));

  const mappedLlps = (llpStatus || []).map(item => ({
    ...item,
    engineSerialNumber: headerData.engineSerialNumber
  }));

  const mappedSbs = (sbStatus || []).map(item => ({
    ...item,
    engineSerialNumber: headerData.engineSerialNumber
  }));

  const mappedAds = (adStatus || []).map(item => ({
    ...item,
    engineSerialNumber: headerData.engineSerialNumber
  }));

  // Prevent duplicates by deleting existing document with same ESN and filename
  if (headerData.engineSerialNumber && headerData.originalFileName) {
    await prisma.iq03Report.deleteMany({
      where: {
        engineSerialNumber: headerData.engineSerialNumber,
        originalFileName: headerData.originalFileName
      }
    });
  }

  return prisma.iq03Report.create({
    data: {
      ...headerData,
      engineId,
      configurationReport: {
        create: mappedConfigs
      },
      llpStatus: {
        create: mappedLlps
      },
      sbStatus: {
        create: mappedSbs
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
  return prisma.iq03Report.findUnique({
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
  return prisma.iq03Report.findMany({
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
  return prisma.iq03Report.count({ where });
};

/**
 * Deletes a Iq03Report record.
 */
const deleteIq03Report = async (id) => {
  return prisma.iq03Report.delete({
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

