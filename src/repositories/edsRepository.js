const prisma = require('../db');

const includeRelations = {
  engine: true,
  configurationReport: true,
  sbStatus: true,
  complianceRecords: {
    include: {
      sb: true,
      sb: true
    }
  }
};

/**
 * Creates a new engineDataSubmittal record along with its child relations.
 */
const createengineDataSubmittal = async (data) => {
  const { configurationReport, llpStatus, sbStatus, ...headerData } = data;
  
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
    engineSerialNumber: headerData.engineSerialNumber
  }));

  const mappedSbs = (sbStatus || []).map(item => ({
    ...item,
    engineSerialNumber: headerData.engineSerialNumber
  }));

  return prisma.engineDataSubmittal.create({
    data: {
      ...headerData,
      engineId,
      configurationReport: {
        create: mappedConfigs
      },
      sbStatus: {
        create: mappedSbs
      }
    },
    include: includeRelations
  });
};

/**
 * Retrieves a engineDataSubmittal by ID.
 */
const findengineDataSubmittalById = async (id) => {
  return prisma.engineDataSubmittal.findUnique({
    where: { id },
    include: includeRelations
  });
};

/**
 * Lists engineDataSubmittals with filter and pagination.
 */
const listengineDataSubmittals = async ({ skip = 0, take = 20, esn } = {}) => {
  const where = {};
  if (esn) {
    where.engineSerialNumber = esn;
  }
  return prisma.engineDataSubmittal.findMany({
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
 * Counts engineDataSubmittals matching filters.
 */
const countengineDataSubmittals = async ({ esn } = {}) => {
  const where = {};
  if (esn) {
    where.engineSerialNumber = esn;
  }
  return prisma.engineDataSubmittal.count({ where });
};

/**
 * Deletes a engineDataSubmittal record.
 */
const deleteengineDataSubmittal = async (id) => {
  return prisma.engineDataSubmittal.delete({
    where: { id },
    include: includeRelations
  });
};

module.exports = {
  createengineDataSubmittal,
  findengineDataSubmittalById,
  listengineDataSubmittals,
  countengineDataSubmittals,
  deleteengineDataSubmittal
};

