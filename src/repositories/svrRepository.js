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
 * Creates a new ShopVisitReport record along with its child relations.
 */
const createShopVisitReport = async (data) => {
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

  return prisma.shopVisitReport.create({
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
 * Retrieves a ShopVisitReport by ID.
 */
const findShopVisitReportById = async (id) => {
  return prisma.shopVisitReport.findUnique({
    where: { id },
    include: includeRelations
  });
};

/**
 * Lists ShopVisitReports with filter and pagination.
 */
const listShopVisitReports = async ({ skip = 0, take = 20, esn } = {}) => {
  const where = {};
  if (esn) {
    where.engineSerialNumber = esn;
  }
  return prisma.shopVisitReport.findMany({
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
 * Counts ShopVisitReports matching filters.
 */
const countShopVisitReports = async ({ esn } = {}) => {
  const where = {};
  if (esn) {
    where.engineSerialNumber = esn;
  }
  return prisma.shopVisitReport.count({ where });
};

/**
 * Deletes a ShopVisitReport record.
 */
const deleteShopVisitReport = async (id) => {
  return prisma.shopVisitReport.delete({
    where: { id },
    include: includeRelations
  });
};

module.exports = {
  createShopVisitReport,
  findShopVisitReportById,
  listShopVisitReports,
  countShopVisitReports,
  deleteShopVisitReport
};
