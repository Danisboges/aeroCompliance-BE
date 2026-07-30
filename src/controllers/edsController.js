const edsService = require('../services/edsService');

const listEds = async (req, res) => {
  try {
    const result = await edsService.listEngineDataSubmittals(req.query);
    return res.status(200).json({
      data: result.items,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Error listing EDS:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

const getEdsById = async (req, res) => {
  try {
    const eds = await edsService.getEngineDataSubmittalById(req.params.id);
    return res.status(200).json({ data: eds });
  } catch (error) {
    console.error('Error getting EDS by ID:', error);
    if (error.message.startsWith('Not Found')) {
      return res.status(404).json({ error: error.message });
    }
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

module.exports = {
  listEds,
  getEdsById
};
