// lib/logger.ts
// Centralized logging utility with environment-based filtering
import * as Sentry from '@sentry/react-native';

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
        
        // Capture error in Sentry for production monitoring
        if (!isDevelopment) {
          Sentry.captureMessage(`[ERROR] ${message}`, 'error');
          if (optionalParams.length > 0) {
            // Add extra data to Sentry if available
            Sentry.setExtra('extra_data', optionalParams);
          }
        }
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
  
  // Capture warnings in Sentry if needed
  if (!isDevelopment) {
    Sentry.captureMessage(`[WARN] ${message}`, 'warning');
  }
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
    
    // Capture the error object in Sentry
    if (!isDevelopment) {
      Sentry.captureException(error, {
        contexts: {
          custom: {
            context: context,
          },
        },
      });
    }
  } else {
    log(LogLevel.ERROR, `${context}: ${String(error)}`);
    
    // Capture non-error objects as messages
    if (!isDevelopment) {
      Sentry.captureMessage(`${context}: ${String(error)}`, 'error');
    }
  }
}

export default {
  debug,
  info,
  warn,
  error,
  logError,
};