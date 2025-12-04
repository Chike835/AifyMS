import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define log levels
const levels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4
};

// Define log colors
const colors = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'blue'
};

winston.addColors(colors);

// Define log format
const format = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
);

// Define console format (for development)
const consoleFormat = winston.format.combine(
    winston.format.colorize({ all: true }),
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(
        (info) => `${info.timestamp} ${info.level}: ${info.message}`
    )
);

// Define transports
const transports = [
    // Console transport for all environments
    new winston.transports.Console({
        format: consoleFormat,
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug'
    }),

    // File transport for errors
    new winston.transports.File({
        filename: path.join(__dirname, '../../logs/error.log'),
        level: 'error',
        format,
        maxsize: 5242880, // 5MB
        maxFiles: 5
    }),

    // File transport for all logs
    new winston.transports.File({
        filename: path.join(__dirname, '../../logs/combined.log'),
        format,
        maxsize: 5242880, // 5MB
        maxFiles: 5
    })
];

// Create logger instance
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    levels,
    format,
    transports,
    exitOnError: false
});

// Create a stream object for Morgan HTTP logger
logger.stream = {
    write: (message) => {
        logger.http(message.trim());
    }
};

/**
 * Helper function to log with request context
 * @param {string} level - Log level (error, warn, info, debug)
 * @param {string} message - Log message
 * @param {object} meta - Additional metadata (userId, requestId, etc.)
 */
export const logWithContext = (level, message, meta = {}) => {
    logger.log(level, message, meta);
};

/**
 * Log critical errors (database failures, unhandled exceptions)
 */
export const logError = (message, error, meta = {}) => {
    logger.error(message, {
        error: error?.message,
        stack: error?.stack,
        ...meta
    });
};

/**
 * Log warnings (deprecated API usage, high latency)
 */
export const logWarning = (message, meta = {}) => {
    logger.warn(message, meta);
};

/**
 * Log informational messages (payment confirmed, inventory updated)
 */
export const logInfo = (message, meta = {}) => {
    logger.info(message, meta);
};

/**
 * Log debug messages (development only)
 */
export const logDebug = (message, meta = {}) => {
    logger.debug(message, meta);
};

/**
 * Log HTTP requests (use with Morgan)
 */
export const logHttp = (message, meta = {}) => {
    logger.http(message, meta);
};

export default logger;
