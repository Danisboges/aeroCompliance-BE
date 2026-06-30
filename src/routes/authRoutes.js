const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken, requireAdmin, requireTechnician } = require('../middleware/authMiddleware');

// Routes mapping for Authentication
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);

// Test endpoints for RBAC verification
router.get('/admin-only', verifyToken, requireAdmin, (req, res) => {
  res.status(200).json({ message: 'Welcome ADMIN!', user: req.user });
});

router.get('/technician-only', verifyToken, requireTechnician, (req, res) => {
  res.status(200).json({ message: 'Welcome TECHNICIAN!', user: req.user });
});

module.exports = router;
