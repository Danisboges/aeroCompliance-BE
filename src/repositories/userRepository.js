const prisma = require('../db');

/**
 * Finds a unique user by their email address.
 * 
 * @param {string} email - The email to search.
 * @returns {Promise<Object|null>} The found user object or null.
 */
const findUserByEmail = async (email) => {
  return await prisma.user.findUnique({
    where: { email }
  });
};

/**
 * Finds a unique user by their username.
 * 
 * @param {string} username - The username to search.
 * @returns {Promise<Object|null>} The found user object or null.
 */
const findUserByUsername = async (username) => {
  return await prisma.user.findUnique({
    where: { username }
  });
};

/**
 * Finds a user by email or username.
 * 
 * @param {string} identifier - Email or Username to match.
 * @returns {Promise<Object|null>} The found user object or null.
 */
const findUserByEmailOrUsername = async (identifier) => {
  return await prisma.user.findFirst({
    where: {
      OR: [
        { email: identifier },
        { username: identifier }
      ]
    }
  });
};

const { generateId } = require('../utils/idGenerator');

/**
 * Creates a new user record.
 * 
 * @param {Object} userData - User details including email, username, hashed password, and role.
 * @returns {Promise<Object>} The created user object.
 */
const createUser = async (userData) => {
  return await prisma.user.create({
    data: {
      id: generateId('USR'),
      email: userData.email,
      username: userData.username,
      password: userData.password,
      role: userData.role
    }
  });
};

module.exports = {
  findUserByEmail,
  findUserByUsername,
  findUserByEmailOrUsername,
  createUser
};
