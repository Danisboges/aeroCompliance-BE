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
 * Creates a new user record.
 * 
 * @param {Object} userData - User details including email, hashed password, and role.
 * @returns {Promise<Object>} The created user object.
 */
const createUser = async (userData) => {
  return await prisma.user.create({
    data: {
      email: userData.email,
      password: userData.password,
      role: userData.role
    }
  });
};

module.exports = {
  findUserByEmail,
  createUser
};
