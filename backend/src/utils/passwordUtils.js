/**
 * Password utilities with bcrypt/bcryptjs abstraction
 * Uses bcryptjs (pure JS) when USE_BCRYPT_JS=true to avoid native module issues in Docker
 */

// Conditionally import based on environment variable
const useBcryptJs = process.env.USE_BCRYPT_JS === 'true';

let bcryptModule;

if (useBcryptJs) {
  // Use pure JavaScript implementation (slower but more portable)
  bcryptModule = await import('bcryptjs');
  console.log('🔐 Using bcryptjs (pure JS implementation)');
} else {
  // Use native bcrypt (faster but requires native compilation)
  bcryptModule = await import('bcrypt');
  console.log('🔐 Using bcrypt (native implementation)');
}

// Handle both default and named exports
const bcrypt = bcryptModule.default || bcryptModule;

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
  return await bcrypt.hash(password, saltRounds);
};

/**
 * Compare a password with a hash
 * @param {string} password - Plain text password to check
 * @param {string} hash - Hash to compare against
 * @returns {Promise<boolean>} True if password matches
 */
export const comparePassword = async (password, hash) => {
  if (!password || !hash) {
    console.error('comparePassword called with missing arguments:', { 
      hasPassword: !!password, 
      hasHash: !!hash 
    });
    return false;
  }
  
  try {
    return await bcrypt.compare(password, hash);
  } catch (error) {
    console.error('Password comparison error:', error.message);
    throw error;
  }
};

export default {
  hash: hashPassword,
  compare: comparePassword
};












