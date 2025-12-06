/**
 * Password utilities with bcrypt/bcryptjs abstraction
 * Uses bcryptjs (pure JS) when USE_BCRYPT_JS=true to avoid native module issues in Docker
 */

// Conditionally import based on environment variable
const useBcryptJs = process.env.USE_BCRYPT_JS === 'true';

let bcryptModule;

try {
  if (useBcryptJs) {
    // Use pure JavaScript implementation (slower but more portable)
    bcryptModule = await import('bcryptjs');

  } else {
    // Use native bcrypt (faster but requires native compilation)
    bcryptModule = await import('bcrypt');

  }
} catch (error) {

  // Fallback to bcryptjs if native fails
  try {

    bcryptModule = await import('bcryptjs');

  } catch (fallbackError) {

    throw fallbackError;
  }
}

// Handle both default and named exports
const bcrypt = bcryptModule.default || bcryptModule;

// Verify bcrypt module is loaded correctly
if (!bcrypt) {

  throw new Error('Bcrypt module failed to load');
}

if (typeof bcrypt.hash !== 'function' || typeof bcrypt.compare !== 'function') {

  throw new Error('Bcrypt module is missing required methods (hash/compare)');
}



/**
 * Hash a password
 * @param {string} password - Plain text password
 * @param {number} saltRounds - Number of salt rounds (default: 10)
 * @returns {Promise<string>} Hashed password
 */
export const hashPassword = async (password, saltRounds = 10) => {
  if (!password) {
    throw new Error('Password is required for hashing');
  }

  if (!bcrypt || typeof bcrypt.hash !== 'function') {

    throw new Error('Bcrypt hash function is not available');
  }

  try {
    const hash = await bcrypt.hash(password, saltRounds);

    return hash;
  } catch (error) {

    throw error;
  }
};

/**
 * Compare a password with a hash
 * @param {string} password - Plain text password to check
 * @param {string} hash - Hash to compare against
 * @returns {Promise<boolean>} True if password matches
 */
export const comparePassword = async (password, hash) => {
  if (!password || !hash) {

    return false;
  }

  if (!bcrypt || typeof bcrypt.compare !== 'function') {

    throw new Error('Bcrypt compare function is not available');
  }

  try {

    const match = await bcrypt.compare(password, hash);

    return match;
  } catch (error) {

    throw error;
  }
};

export default {
  hash: hashPassword,
  compare: comparePassword
};












