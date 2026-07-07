const crypto = require('crypto');

/**
 * Generates a unique prefixed ID, e.g. "SB-DOC-A3D5E7B9".
 * @param {string} prefix - The prefix (e.g. 'USR', 'SB-DOC', 'AC')
 * @returns {string} The generated ID string
 */
const generateId = (prefix) => {
  const cleanPrefix = prefix.endsWith('-') ? prefix : `${prefix}-`;
  const randomHex = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `${cleanPrefix}${randomHex}`;
};

module.exports = {
  generateId
};
