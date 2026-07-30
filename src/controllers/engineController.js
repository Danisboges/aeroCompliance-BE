const engineService = require('../services/engineService');

const listEngines = async (req, res) => {
  try {
    const result = await engineService.listEngines(req.query);
    return res.status(200).json({
      data: result.items,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Error listing Engines:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

const getEngineByIdOrEsn = async (req, res) => {
  try {
    const engine = await engineService.getEngineByIdOrEsn(req.params.id_or_esn);
    return res.status(200).json({ data: engine });
  } catch (error) {
    console.error('Error getting Engine by ID/ESN:', error);
    if (error.message.startsWith('Not Found')) {
      return res.status(404).json({ error: error.message });
    }
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

module.exports = {
  listEngines,
  getEngineByIdOrEsn
};
