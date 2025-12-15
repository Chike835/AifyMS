/**
 * Locale Configuration
 * Centralized locale settings for the application
 */

// Default locale for currency formatting and date display
export const DEFAULT_LOCALE = 'en-NG';

// Default currency code
export const DEFAULT_CURRENCY = 'NGN';

/**
 * Get locale from environment or use default
 * Future: Can be made configurable via BusinessSettings
 */
export const getLocale = () => {
  return process.env.LOCALE || DEFAULT_LOCALE;
};

/**
 * Get currency code from environment or use default
 * Future: Can be made configurable via BusinessSettings
 */
export const getCurrency = () => {
  return process.env.CURRENCY || DEFAULT_CURRENCY;
};






















