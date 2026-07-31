const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { verifyToken } = require('../middleware/authMiddleware');

// Must be declared before /:id so it is not treated as a user ID.
router.get('/approval-candidates', verifyToken, userController.getApprovalCandidates);

// GET /api/users
router.get('/', verifyToken, userController.getUsers);

// GET /api/users/me
router.get('/me', verifyToken, userController.getMe);

// GET /api/users/:id
router.get('/:id', verifyToken, userController.getUserById);

module.exports = router;
