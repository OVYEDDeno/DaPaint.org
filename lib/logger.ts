// lib/logger.ts
// Centralized logging utility with environment-based filtering

const isDevelopment = process.env.NODE_ENV === 'development';

// Log levels
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

// Current log level (can be adjusted based on environment)
const CURRENT_LOG_LEVEL = isDevelopment ? LogLevel.DEBUG : LogLevel.ERROR;

/**
 * Generic logger function
 * @param level - The log level
 * @param message - The message to log
 * @param optionalParams - Additional parameters to log
 */
function log(level: LogLevel, message: string, ...optionalParams: any[]) {
  // Only log if the current level allows it
  if (level >= CURRENT_LOG_LEVEL) {
    const timestamp = new Date().toISOString();
    const levelString = LogLevel[level];
    
    switch (level) {
      case LogLevel.DEBUG:
        console.debug(`[DEBUG][${timestamp}] ${message}`, ...optionalParams);
        break;
      case LogLevel.INFO:
        console.info(`[INFO][${timestamp}] ${message}`, ...optionalParams);
        break;
      case LogLevel.WARN:
        console.warn(`[WARN][${timestamp}] ${message}`, ...optionalParams);
        break;
      case LogLevel.ERROR:
        console.error(`[ERROR][${timestamp}] ${message}`, ...optionalParams);
        break;
    }
  }
}

/**
 * Debug level logging
 */
export function debug(message: string, ...optionalParams: any[]) {
  log(LogLevel.DEBUG, message, ...optionalParams);
}

/**
 * Info level logging
 */
export function info(message: string, ...optionalParams: any[]) {
  log(LogLevel.INFO, message, ...optionalParams);
}

/**
 * Warning level logging
 */
export function warn(message: string, ...optionalParams: any[]) {
  log(LogLevel.WARN, message, ...optionalParams);
}

/**
 * Error level logging
 */
export function error(message: string, ...optionalParams: any[]) {
  log(LogLevel.ERROR, message, ...optionalParams);
}

/**
 * Log an error object with context
 */
export function logError(context: string, error: any) {
  if (error instanceof Error) {
    log(LogLevel.ERROR, `${context}: ${error.message}`, error.stack);
  } else {
    log(LogLevel.ERROR, `${context}: ${String(error)}`);
  }
}

export default {
  debug,
  info,
  warn,
  error,
  logError,
};