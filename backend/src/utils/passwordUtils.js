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
    console.log('[AUTH-DEBUG] 🔐 Using bcryptjs (pure JS implementation)');
  } else {
    // Use native bcrypt (faster but requires native compilation)
    bcryptModule = await import('bcrypt');
    console.log('[AUTH-DEBUG] 🔐 Using bcrypt (native implementation)');
  }
} catch (error) {
  console.error('[AUTH-DEBUG] ❌ Failed to load bcrypt module:', error.message);
  // Fallback to bcryptjs if native fails
  try {
    console.log('[AUTH-DEBUG] ⚠️ Attempting fallback to bcryptjs...');
    bcryptModule = await import('bcryptjs');
    console.log('[AUTH-DEBUG] 🔐 Fallback to bcryptjs successful');
  } catch (fallbackError) {
    console.error('[AUTH-DEBUG] ❌ CRITICAL: Failed to load any bcrypt implementation');
    throw fallbackError;
  }
}

// Handle both default and named exports
const bcrypt = bcryptModule.default || bcryptModule;

// Verify bcrypt module is loaded correctly
if (!bcrypt) {
  console.error('[AUTH-DEBUG] ❌ CRITICAL: bcrypt module is null or undefined');
  throw new Error('Bcrypt module failed to load');
}

if (typeof bcrypt.hash !== 'function' || typeof bcrypt.compare !== 'function') {
  console.error('[AUTH-DEBUG] ❌ CRITICAL: bcrypt module missing required methods');
  console.error('[AUTH-DEBUG] Available methods:', Object.keys(bcrypt));
  throw new Error('Bcrypt module is missing required methods (hash/compare)');
}

console.log('[AUTH-DEBUG] ✅ Bcrypt module loaded successfully');
console.log('[AUTH-DEBUG] Bcrypt module type:', useBcryptJs ? 'bcryptjs' : 'bcrypt (native)');
console.log('[AUTH-DEBUG] Bcrypt methods available:', Object.keys(bcrypt).filter(key => typeof bcrypt[key] === 'function'));

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
    console.error('[AUTH-DEBUG] ❌ Bcrypt.hash is not available');
    throw new Error('Bcrypt hash function is not available');
  }
  
  try {
    const hash = await bcrypt.hash(password, saltRounds);
    console.log(`[AUTH-DEBUG] Password hashed successfully, hash length: ${hash.length}`);
    return hash;
  } catch (error) {
    console.error('[AUTH-DEBUG] Error hashing password:', error.message);
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
    console.error('[AUTH-DEBUG] comparePassword called with missing arguments:', {
      hasPassword: !!password,
      hasHash: !!hash,
      passwordType: typeof password,
      hashType: typeof hash
    });
    return false;
  }

  if (!bcrypt || typeof bcrypt.compare !== 'function') {
    console.error('[AUTH-DEBUG] ❌ Bcrypt.compare is not available');
    throw new Error('Bcrypt compare function is not available');
  }

  try {
    console.log(`[AUTH-DEBUG] Comparing password (length: ${password.length}) with hash (length: ${hash.length}, prefix: ${hash.substring(0, 7)}...)`);
    const match = await bcrypt.compare(password, hash);
    console.log(`[AUTH-DEBUG] Password comparison result: ${match ? '✅ MATCH' : '❌ MISMATCH'}`);
    return match;
  } catch (error) {
    console.error('[AUTH-DEBUG] Password comparison error:', error.message);
    console.error('[AUTH-DEBUG] Error stack:', error.stack);
    throw error;
  }
};

export default {
  hash: hashPassword,
  compare: comparePassword
};












