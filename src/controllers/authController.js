const authService = require('../services/authService');

// Handles user registration requests
const register = async (req, res) => {
  try {
    const { email, username, password, role } = req.body;
    const user = await authService.registerUser(email, username, password, role);

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
    const { email, username, password } = req.body;
    const identifier = username || email;
    const result = await authService.loginUser(identifier, password);

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

// Handles user logout requests
const logout = async (req, res) => {
  try {
    // Since JWT is stateless and we don't have a token blacklist in DB,
    // logout is primarily handled on the client side by deleting the token.
    // This endpoint serves as a confirmation and can be expanded later 
    // if token blacklisting or refresh tokens are implemented.
    return res.status(200).json({
      message: 'Logout successful'
    });
  } catch (error) {
    console.error('Error in user logout:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      details: error.message
    });
  }
};

module.exports = {
  register,
  login,
  logout
};
