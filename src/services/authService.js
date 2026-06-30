const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userRepository = require('../repositories/userRepository');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key';

/**
 * Registers a new user.
 * 
 * @param {string} email 
 * @param {string} password 
 * @param {string} role - 'ADMIN' or 'TECHNICIAN'
 * @returns {Promise<Object>} The created user (without password).
 */
const registerUser = async (email, password, role) => {
  // Validate email and password inputs
  if (!email || !password || !role) {
    throw new Error('Validation Error: email, password, and role are required');
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

  // Hash password
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  // Save user to database
  const user = await userRepository.createUser({
    email,
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
 * @param {string} email 
 * @param {string} password 
 * @returns {Promise<Object>} An object containing the user profile and the token.
 */
const loginUser = async (email, password) => {
  if (!email || !password) {
    throw new Error('Validation Error: email and password are required');
  }

  // Find user
  const user = await userRepository.findUserByEmail(email);
  if (!user) {
    throw new Error('Validation Error: Invalid email or password');
  }

  // Verify password
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new Error('Validation Error: Invalid email or password');
  }

  // Generate JWT token
  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
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
