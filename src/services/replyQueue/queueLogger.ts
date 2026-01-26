/**
 * Queue Logger - Logging utility for the reply queue system
 * Works in both background service worker and content script contexts
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4
}

export interface LogEntry {
  timestamp: number;
  level: LogLevel;
  context: string;
  message: string;
  data?: any;
  error?: Error;
}

// Configuration
let currentLogLevel: LogLevel = LogLevel.INFO;
const LOG_HISTORY_SIZE = 100;
const logHistory: LogEntry[] = [];

// Timing tracking for performance measurements
const timers = new Map<string, number>();

/**
 * Set the minimum log level to display
 */
export function setLogLevel(level: LogLevel): void {
  currentLogLevel = level;
}

/**
 * Get current log level
 */
export function getLogLevel(): LogLevel {
  return currentLogLevel;
}

/**
 * Get log history for debugging
 */
export function getLogHistory(): LogEntry[] {
  return [...logHistory];
}

/**
 * Clear log history
 */
export function clearLogHistory(): void {
  logHistory.length = 0;
}

/**
 * Format a log entry for console output
 */
function formatLogEntry(entry: LogEntry): string {
  const timestamp = new Date(entry.timestamp).toISOString();
  const levelStr = LogLevel[entry.level].padEnd(5);
  return `[${timestamp}] [${levelStr}] [${entry.context}] ${entry.message}`;
}

/**
 * Add entry to history
 */
function addToHistory(entry: LogEntry): void {
  logHistory.push(entry);
  if (logHistory.length > LOG_HISTORY_SIZE) {
    logHistory.shift();
  }
}

/**
 * Core logging function
 */
function log(level: LogLevel, context: string, message: string, data?: any, error?: Error): void {
  const entry: LogEntry = {
    timestamp: Date.now(),
    level,
    context,
    message,
    data,
    error
  };

  addToHistory(entry);

  if (level < currentLogLevel) {
    return;
  }

  const formattedMessage = formatLogEntry(entry);

  switch (level) {
    case LogLevel.DEBUG:
      if (data !== undefined) {
        console.debug(formattedMessage, data);
      } else {
        console.debug(formattedMessage);
      }
      break;
    case LogLevel.INFO:
      if (data !== undefined) {
        console.info(formattedMessage, data);
      } else {
        console.info(formattedMessage);
      }
      break;
    case LogLevel.WARN:
      if (error) {
        console.warn(formattedMessage, data, error);
      } else if (data !== undefined) {
        console.warn(formattedMessage, data);
      } else {
        console.warn(formattedMessage);
      }
      break;
    case LogLevel.ERROR:
      if (error) {
        console.error(formattedMessage, data, error);
      } else if (data !== undefined) {
        console.error(formattedMessage, data);
      } else {
        console.error(formattedMessage);
      }
      break;
  }
}

/**
 * Create a scoped logger for a specific context
 */
export function createScopedLogger(context: string) {
  return {
    debug: (message: string, data?: any) => log(LogLevel.DEBUG, context, message, data),
    info: (message: string, data?: any) => log(LogLevel.INFO, context, message, data),
    warn: (message: string, data?: any, error?: Error) => log(LogLevel.WARN, context, message, data, error),
    error: (message: string, data?: any, error?: Error) => log(LogLevel.ERROR, context, message, data, error),

    /**
     * Start a timer for performance measurement
     */
    startTimer: (timerId: string): void => {
      const fullId = `${context}:${timerId}`;
      timers.set(fullId, performance.now());
      log(LogLevel.DEBUG, context, `Timer started: ${timerId}`);
    },

    /**
     * End a timer and log the duration
     */
    endTimer: (timerId: string): number => {
      const fullId = `${context}:${timerId}`;
      const startTime = timers.get(fullId);
      if (startTime === undefined) {
        log(LogLevel.WARN, context, `Timer not found: ${timerId}`);
        return 0;
      }
      const duration = performance.now() - startTime;
      timers.delete(fullId);
      log(LogLevel.DEBUG, context, `Timer ended: ${timerId}`, { durationMs: duration.toFixed(2) });
      return duration;
    },

    /**
     * Log a success message (INFO level with success prefix)
     */
    success: (message: string, data?: any) => log(LogLevel.INFO, context, `✓ ${message}`, data),

    /**
     * Log task progress
     */
    progress: (current: number, total: number, message: string) => {
      const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
      log(LogLevel.INFO, context, `[${current}/${total}] (${percentage}%) ${message}`);
    },

    /**
     * Log with structured data for metrics
     */
    metric: (metricName: string, value: number, unit: string = '', tags?: Record<string, string>) => {
      log(LogLevel.INFO, context, `METRIC: ${metricName}=${value}${unit}`, { metricName, value, unit, tags });
    }
  };
}

// Pre-created loggers for common contexts
export const backgroundWorkerLogger = createScopedLogger('BackgroundWorker');
export const replyQueueLogger = createScopedLogger('ReplyQueueService');
export const taskExecutorLogger = createScopedLogger('TaskExecutor');

// Export type for scoped logger
export type ScopedLogger = ReturnType<typeof createScopedLogger>;
