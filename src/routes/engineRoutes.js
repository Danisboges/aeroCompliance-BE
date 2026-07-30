const express = require('express');
const router = express.Router();
const engineController = require('../controllers/engineController');
const { verifyToken } = require('../middleware/authMiddleware');

// GET /api/engines (Get all Engines)
router.get('/', verifyToken, engineController.listEngines);

// GET /api/engines/:id_or_esn (Get single Engine by ID or ESN)
router.get('/:id_or_esn', verifyToken, engineController.getEngineByIdOrEsn);

module.exports = router;
