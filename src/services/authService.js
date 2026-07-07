const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userRepository = require('../repositories/userRepository');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key';

/**
 * Registers a new user.
 * 
 * @param {string} email 
 * @param {string} username
 * @param {string} password 
 * @param {string} role - 'ADMIN' or 'TECHNICIAN'
 * @returns {Promise<Object>} The created user (without password).
 */
const registerUser = async (email, username, password, role) => {
  // Validate email, username, password and role inputs
  if (!email || !username || !password || !role) {
    throw new Error('Validation Error: email, username, password, and role are required');
  }

  // Validate role enum
  const allowedRoles = ['ADMIN', 'TECHNICIAN'];
  const formattedRole = role.toUpperCase();
  if (!allowedRoles.includes(formattedRole)) {
    throw new Error('Validation Error: Role must be either ADMIN or TECHNICIAN');
  }

  // Check if email already exists
  const existingUser = await userRepository.findUserByEmail(email);
  if (existingUser) {
    throw new Error('Validation Error: Email is already registered');
  }

  // Check if username already exists
  const existingUsername = await userRepository.findUserByUsername(username);
  if (existingUsername) {
    throw new Error('Validation Error: Username is already registered');
  }

  // Hash password
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  // Save user to database
  const user = await userRepository.createUser({
    email,
    username,
    password: hashedPassword,
    role: formattedRole
  });

  // Return user without password
  const { password: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
};

/**
 * Validates user credentials and issues a JWT token.
 * 
 * @param {string} identifier - Email or Username
 * @param {string} password 
 * @returns {Promise<Object>} An object containing the user profile and the token.
 */
const loginUser = async (identifier, password) => {
  if (!identifier || !password) {
    throw new Error('Validation Error: username/email and password are required');
  }

  // Find user by email or username
  const user = await userRepository.findUserByEmailOrUsername(identifier);
  if (!user) {
    throw new Error('Validation Error: Invalid username/email or password');
  }

  // Verify password
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new Error('Validation Error: Invalid username/email or password');
  }

  // Generate JWT token including username
  const token = jwt.sign(
    { id: user.id, email: user.email, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '1d' } // token expires in 24 hours
  );

  // Return user profile (without password) and token
  const { password: _, ...userWithoutPassword } = user;
  return {
    user: userWithoutPassword,
    token
  };
};

module.exports = {
  registerUser,
  loginUser
};
