const prisma = require('../db');

const engineInclude = {
  aircraft: true,
  activeComponents: true,
  complianceRecords: {
    include: {
      sb: true,
      ad: true
    }
  },
  shopVisitReports: {
    orderBy: { createdAt: 'desc' },
    take: 5
  },
  EngineDataSubmittals: {
    orderBy: { createdAt: 'desc' },
    take: 5
  },
  iq03Reports: {
    orderBy: { createdAt: 'desc' },
    take: 5
  }
};

const listEngines = async ({ skip = 0, take = 20 } = {}) => {
  return prisma.engine.findMany({
    skip: parseInt(skip, 10),
    take: parseInt(take, 10),
    orderBy: {
      createdAt: 'desc'
    },
    include: {
      aircraft: true,
      activeComponents: true
    }
  });
};

const countEngines = async () => {
  return prisma.engine.count();
};

const getEngineByIdOrEsn = async (idOrEsn) => {
  return prisma.engine.findFirst({
    where: {
      OR: [
        { id: idOrEsn },
        { esn: idOrEsn }
      ]
    },
    include: engineInclude
  });
};

module.exports = {
  listEngines,
  countEngines,
  getEngineByIdOrEsn
};
