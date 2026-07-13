const express = require('express');
const router = express.Router();
const aircraftController = require('../controllers/aircraftController');
const { verifyToken } = require('../middleware/authMiddleware');

// GET all aircraft
router.get('/aircraft', verifyToken, aircraftController.getAllAircraft);

module.exports = router;
