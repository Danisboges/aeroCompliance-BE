const eesService = require('../services/eesService');

// Controller function to handle EES Webhook POST requests
const handleEesWebhook = async (req, res) => {
  try {
    const result = await eesService.processEesWebhook(req.body);
    
    return res.status(201).json({
      message: 'EesDocument and EesEvaluationItems successfully created',
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

module.exports = {
  handleEesWebhook
};
