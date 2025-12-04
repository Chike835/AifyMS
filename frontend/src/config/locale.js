/**
 * Centralized Locale Configuration
 * 
 * This file contains all locale and formatting settings for the application.
 * Update these values to change the application's locale behavior globally.
 */

export const LOCALE = 'en-NG'; // Nigerian English
export const CURRENCY_CODE = 'NGN'; // Nigerian Naira
export const DATE_FORMAT = 'en-NG'; // Date formatting locale
export const TIME_ZONE = 'Africa/Lagos'; // Default timezone

/**
 * Format currency according to configured locale
 * @param {number} amount - Amount to format
 * @param {string} currencyCode - Currency code (defaults to NGN)
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount, currencyCode = CURRENCY_CODE) => {
    return new Intl.NumberFormat(LOCALE, {
        style: 'currency',
        currency: currencyCode
    }).format(amount || 0);
};

/**
 * Format date according to configured locale
 * @param {string|Date} dateString - Date to format
 * @param {object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted date string
 */
export const formatDate = (dateString, options = {}) => {
    if (!dateString) return '—';

    const defaultOptions = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        ...options
    };

    return new Date(dateString).toLocaleDateString(LOCALE, defaultOptions);
};

/**
 * Format date and time according to configured locale
 * @param {string|Date} dateString - DateTime to format
 * @param {object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted datetime string
 */
export const formatDateTime = (dateString, options = {}) => {
    if (!dateString) return '—';

    const defaultOptions = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        ...options
    };

    return new Date(dateString).toLocaleDateString(LOCALE, defaultOptions);
};

/**
 * Format number according to configured locale
 * @param {number} num - Number to format
 * @param {object} options - Intl.NumberFormat options
 * @returns {string} Formatted number string
 */
export const formatNumber = (num, options = {}) => {
    return new Intl.NumberFormat(LOCALE, options).format(num || 0);
};
