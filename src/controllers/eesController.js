const eesService = require('../services/eesService');

// Controller function to handle EES Webhook POST requests
const handleEesWebhook = async (req, res) => {
  try {
    const result = await eesService.processEesWebhook(req.body);
    
    return res.status(201).json({
      message: result 
        ? 'EesDocument and EesEvaluationItems successfully created'
        : 'Webhook payload received. EES generation skipped for manual compliance category.',
      data: result
    });
  } catch (error) {
    console.error('Error handling EES Webhook:', error);
    
    if (error.message.startsWith('Validation Error')) {
      return res.status(400).json({ error: error.message });
    }
    
    return res.status(500).json({
      error: 'Internal Server Error',
      details: error.message
    });
  }
};

const listEesDocuments = async (req, res) => {
  try {
    const result = await eesService.listEesDocuments(req.query);
    return res.status(200).json({
      data: result.items,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Error listing EES:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

module.exports = {
  handleEesWebhook,
  listEesDocuments
};
