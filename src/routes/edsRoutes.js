const express = require('express');
const router = express.Router();
const edsController = require('../controllers/edsController');
const { verifyToken } = require('../middleware/authMiddleware');

// GET /api/eds (Get all EDS)
router.get('/', verifyToken, edsController.listEds);

// GET /api/eds/:id (Get single EDS by ID)
router.get('/:id', verifyToken, edsController.getEdsById);

module.exports = router;
