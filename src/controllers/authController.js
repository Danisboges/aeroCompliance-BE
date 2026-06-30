const authService = require('../services/authService');

// Handles user registration requests
const register = async (req, res) => {
  try {
    const { email, password, role } = req.body;
    const user = await authService.registerUser(email, password, role);

    return res.status(201).json({
      message: 'User registered successfully',
      data: user
    });
  } catch (error) {
    console.error('Error in user registration:', error);

    if (error.message.startsWith('Validation Error')) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(500).json({
      error: 'Internal Server Error',
      details: error.message
    });
  }
};

// Handles user login requests
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await authService.loginUser(email, password);

    return res.status(200).json({
      message: 'Login successful',
      data: result
    });
  } catch (error) {
    console.error('Error in user login:', error);

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
  register,
  login
};
