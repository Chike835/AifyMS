/**
 * Precision Math Utilities
 * 
 * Handles currency and inventory calculations with decimal precision.
 * Uses integer-based math (multiply by 100 for cents) to avoid floating point errors.
 * 
 * All amounts are stored as integers (cents) internally and converted to/from decimals.
 */

/**
 * Convert decimal to integer (cents)
 * @param {number|string} decimal - Decimal number (e.g., 10.50)
 * @returns {number} Integer in cents (e.g., 1050)
 */
export const toCents = (decimal) => {
  if (decimal === null || decimal === undefined) return 0;
  return Math.round(parseFloat(decimal) * 100);
};

/**
 * Convert integer (cents) to decimal
 * @param {number} cents - Integer in cents (e.g., 1050)
 * @returns {number} Decimal number (e.g., 10.50)
 */
export const fromCents = (cents) => {
  if (cents === null || cents === undefined) return 0;
  return parseFloat(cents) / 100;
};

/**
 * Add two decimal numbers with precision
 * @param {number|string} a - First number
 * @param {number|string} b - Second number
 * @returns {number} Sum as decimal
 */
export const add = (a, b) => {
  const centsA = toCents(a);
  const centsB = toCents(b);
  return fromCents(centsA + centsB);
};

/**
 * Subtract two decimal numbers with precision
 * @param {number|string} a - First number
 * @param {number|string} b - Second number
 * @returns {number} Difference as decimal
 */
export const subtract = (a, b) => {
  const centsA = toCents(a);
  const centsB = toCents(b);
  return fromCents(centsA - centsB);
};

/**
 * Multiply two decimal numbers with precision
 * @param {number|string} a - First number
 * @param {number|string} b - Second number
 * @returns {number} Product as decimal
 */
export const multiply = (a, b) => {
  const centsA = toCents(a);
  const centsB = toCents(b);
  // Multiply cents, then divide by 100 to get back to decimal
  return fromCents(Math.round((centsA * centsB) / 100));
};

/**
 * Divide two decimal numbers with precision
 * @param {number|string} a - Dividend
 * @param {number|string} b - Divisor
 * @returns {number} Quotient as decimal
 */
export const divide = (a, b) => {
  if (parseFloat(b) === 0) {
    throw new Error('Division by zero');
  }
  const centsA = toCents(a);
  const centsB = toCents(b);
  // Multiply by 100 to maintain precision, then divide
  return fromCents(Math.round((centsA * 100) / centsB));
};

/**
 * Calculate percentage of a number
 * @param {number|string} amount - Base amount
 * @param {number|string} percentage - Percentage (e.g., 5 for 5%)
 * @returns {number} Percentage amount as decimal
 */
export const percentage = (amount, percentageValue) => {
  const centsAmount = toCents(amount);
  const pct = parseFloat(percentageValue);
  // Calculate: (amount * percentage) / 100
  return fromCents(Math.round((centsAmount * pct) / 100));
};

/**
 * Compare two decimal numbers with tolerance
 * @param {number|string} a - First number
 * @param {number|string} b - Second number
 * @param {number} tolerance - Tolerance in decimal (default: 0.001)
 * @returns {boolean} True if difference is within tolerance
 */
export const equals = (a, b, tolerance = 0.001) => {
  const diff = Math.abs(subtract(a, b));
  return diff <= tolerance;
};

/**
 * Check if first number is greater than second
 * @param {number|string} a - First number
 * @param {number|string} b - Second number
 * @returns {boolean} True if a > b
 */
export const greaterThan = (a, b) => {
  return toCents(a) > toCents(b);
};

/**
 * Check if first number is less than second
 * @param {number|string} a - First number
 * @param {number|string} b - Second number
 * @returns {boolean} True if a < b
 */
export const lessThan = (a, b) => {
  return toCents(a) < toCents(b);
};

/**
 * Check if first number is greater than or equal to second
 * @param {number|string} a - First number
 * @param {number|string} b - Second number
 * @returns {boolean} True if a >= b
 */
export const greaterThanOrEqual = (a, b) => {
  return toCents(a) >= toCents(b);
};

/**
 * Check if first number is less than or equal to second
 * @param {number|string} a - First number
 * @param {number|string} b - Second number
 * @returns {boolean} True if a <= b
 */
export const lessThanOrEqual = (a, b) => {
  return toCents(a) <= toCents(b);
};

/**
 * Sum an array of decimal numbers
 * @param {Array<number|string>} numbers - Array of numbers to sum
 * @returns {number} Sum as decimal
 */
export const sum = (numbers) => {
  if (!Array.isArray(numbers)) return 0;
  let totalCents = 0;
  for (const num of numbers) {
    totalCents += toCents(num);
  }
  return fromCents(totalCents);
};

/**
 * Round to specified decimal places
 * @param {number|string} value - Value to round
 * @param {number} decimals - Number of decimal places (default: 2)
 * @returns {number} Rounded value
 */
export const round = (value, decimals = 2) => {
  const factor = Math.pow(10, decimals);
  return Math.round(parseFloat(value) * factor) / factor;
};

export default {
  toCents,
  fromCents,
  add,
  subtract,
  multiply,
  divide,
  percentage,
  equals,
  greaterThan,
  lessThan,
  greaterThanOrEqual,
  lessThanOrEqual,
  sum,
  round
};









