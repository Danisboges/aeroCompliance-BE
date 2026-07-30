const engineRepository = require('../repositories/engineRepository');

const listEngines = async (query = {}) => {
  const { page = 1, limit = 20 } = query;
  const skip = (page - 1) * limit;

  const [engines, total] = await Promise.all([
    engineRepository.listEngines({ skip, take: limit }),
    engineRepository.countEngines()
  ]);

  return {
    items: engines,
    pagination: {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      total,
      totalPages: Math.ceil(total / limit) || 1
    }
  };
};

const getEngineByIdOrEsn = async (idOrEsn) => {
  const engine = await engineRepository.getEngineByIdOrEsn(idOrEsn);
  if (!engine) {
    throw new Error('Not Found: Engine does not exist');
  }
  return engine;
};

module.exports = {
  listEngines,
  getEngineByIdOrEsn
};
