/**
 * Tests for Queue Logger
 * Tests for LogLevel, createScopedLogger, and logger utility functions
 */

import {
  LogLevel,
  LogEntry,
  setLogLevel,
  getLogLevel,
  getLogHistory,
  clearLogHistory,
  createScopedLogger,
  backgroundWorkerLogger,
  replyQueueLogger,
  taskExecutorLogger,
  ScopedLogger
} from './queueLogger';

describe('queueLogger', () => {
  // Store original console methods
  const originalConsoleDebug = console.debug;
  const originalConsoleInfo = console.info;
  const originalConsoleWarn = console.warn;
  const originalConsoleError = console.error;

  // Mock console methods
  let mockConsoleDebug: ReturnType<typeof vi.fn>;
  let mockConsoleInfo: ReturnType<typeof vi.fn>;
  let mockConsoleWarn: ReturnType<typeof vi.fn>;
  let mockConsoleError: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Clear log history before each test
    clearLogHistory();

    // Reset log level to default
    setLogLevel(LogLevel.INFO);

    // Setup console mocks
    mockConsoleDebug = vi.fn();
    mockConsoleInfo = vi.fn();
    mockConsoleWarn = vi.fn();
    mockConsoleError = vi.fn();

    console.debug = mockConsoleDebug as any;
    console.info = mockConsoleInfo as any;
    console.warn = mockConsoleWarn as any;
    console.error = mockConsoleError as any;
  });

  afterEach(() => {
    // Restore original console methods
    console.debug = originalConsoleDebug;
    console.info = originalConsoleInfo;
    console.warn = originalConsoleWarn;
    console.error = originalConsoleError;
  });

  describe('LogLevel enum', () => {
    it('should have DEBUG level with value 0', () => {
      expect(LogLevel.DEBUG).toBe(0);
    });

    it('should have INFO level with value 1', () => {
      expect(LogLevel.INFO).toBe(1);
    });

    it('should have WARN level with value 2', () => {
      expect(LogLevel.WARN).toBe(2);
    });

    it('should have ERROR level with value 3', () => {
      expect(LogLevel.ERROR).toBe(3);
    });

    it('should have NONE level with value 4', () => {
      expect(LogLevel.NONE).toBe(4);
    });

    it('should have levels in ascending order of severity', () => {
      expect(LogLevel.DEBUG).toBeLessThan(LogLevel.INFO);
      expect(LogLevel.INFO).toBeLessThan(LogLevel.WARN);
      expect(LogLevel.WARN).toBeLessThan(LogLevel.ERROR);
      expect(LogLevel.ERROR).toBeLessThan(LogLevel.NONE);
    });
  });

  describe('setLogLevel / getLogLevel', () => {
    it('should set and get log level', () => {
      setLogLevel(LogLevel.DEBUG);
      expect(getLogLevel()).toBe(LogLevel.DEBUG);

      setLogLevel(LogLevel.ERROR);
      expect(getLogLevel()).toBe(LogLevel.ERROR);
    });

    it('should default to INFO level', () => {
      // Reset by setting to INFO
      setLogLevel(LogLevel.INFO);
      expect(getLogLevel()).toBe(LogLevel.INFO);
    });

    it('should accept NONE level to disable all logging', () => {
      setLogLevel(LogLevel.NONE);
      expect(getLogLevel()).toBe(LogLevel.NONE);
    });
  });

  describe('getLogHistory / clearLogHistory', () => {
    it('should return empty array initially', () => {
      clearLogHistory();
      expect(getLogHistory()).toEqual([]);
    });

    it('should return a copy of log history', () => {
      const logger = createScopedLogger('Test');
      logger.info('Test message');

      const history1 = getLogHistory();
      const history2 = getLogHistory();

      expect(history1).not.toBe(history2); // Different array references
      expect(history1).toEqual(history2); // Same content
    });

    it('should clear all entries when clearLogHistory is called', () => {
      const logger = createScopedLogger('Test');
      logger.info('Message 1');
      logger.info('Message 2');

      expect(getLogHistory().length).toBe(2);

      clearLogHistory();
      expect(getLogHistory().length).toBe(0);
    });

    it('should preserve log entries after logging', () => {
      const logger = createScopedLogger('Test');
      logger.info('First message');
      logger.warn('Second message');

      const history = getLogHistory();
      expect(history.length).toBe(2);
      expect(history[0].message).toBe('First message');
      expect(history[1].message).toBe('Second message');
    });
  });

  describe('createScopedLogger', () => {
    it('should create a logger with the specified context', () => {
      const logger = createScopedLogger('MyContext');
      logger.info('Test message');

      const history = getLogHistory();
      expect(history.length).toBe(1);
      expect(history[0].context).toBe('MyContext');
    });

    it('should return an object with all required logging methods', () => {
      const logger = createScopedLogger('Test');

      expect(typeof logger.debug).toBe('function');
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.startTimer).toBe('function');
      expect(typeof logger.endTimer).toBe('function');
      expect(typeof logger.success).toBe('function');
      expect(typeof logger.progress).toBe('function');
      expect(typeof logger.metric).toBe('function');
    });

    describe('debug method', () => {
      it('should log debug messages when log level is DEBUG', () => {
        setLogLevel(LogLevel.DEBUG);
        const logger = createScopedLogger('Test');
        logger.debug('Debug message');

        expect(mockConsoleDebug).toHaveBeenCalled();
        const history = getLogHistory();
        expect(history.length).toBe(1);
        expect(history[0].level).toBe(LogLevel.DEBUG);
      });

      it('should not log debug messages when log level is INFO', () => {
        setLogLevel(LogLevel.INFO);
        const logger = createScopedLogger('Test');
        logger.debug('Debug message');

        expect(mockConsoleDebug).not.toHaveBeenCalled();
        // Entry should still be added to history
        const history = getLogHistory();
        expect(history.length).toBe(1);
      });

      it('should log debug messages with data', () => {
        setLogLevel(LogLevel.DEBUG);
        const logger = createScopedLogger('Test');
        const data = { key: 'value' };
        logger.debug('Debug with data', data);

        expect(mockConsoleDebug).toHaveBeenCalled();
        const history = getLogHistory();
        expect(history[0].data).toEqual(data);
      });
    });

    describe('info method', () => {
      it('should log info messages', () => {
        const logger = createScopedLogger('Test');
        logger.info('Info message');

        expect(mockConsoleInfo).toHaveBeenCalled();
        const history = getLogHistory();
        expect(history[0].level).toBe(LogLevel.INFO);
      });

      it('should log info messages with data', () => {
        const logger = createScopedLogger('Test');
        const data = { count: 10 };
        logger.info('Info with data', data);

        expect(mockConsoleInfo).toHaveBeenCalled();
        const history = getLogHistory();
        expect(history[0].data).toEqual(data);
      });
    });

    describe('warn method', () => {
      it('should log warning messages', () => {
        const logger = createScopedLogger('Test');
        logger.warn('Warning message');

        expect(mockConsoleWarn).toHaveBeenCalled();
        const history = getLogHistory();
        expect(history[0].level).toBe(LogLevel.WARN);
      });

      it('should log warning messages with data and error', () => {
        const logger = createScopedLogger('Test');
        const data = { reason: 'timeout' };
        const error = new Error('Test error');
        logger.warn('Warning with error', data, error);

        expect(mockConsoleWarn).toHaveBeenCalled();
        const history = getLogHistory();
        expect(history[0].data).toEqual(data);
        expect(history[0].error).toBe(error);
      });
    });

    describe('error method', () => {
      it('should log error messages', () => {
        const logger = createScopedLogger('Test');
        logger.error('Error message');

        expect(mockConsoleError).toHaveBeenCalled();
        const history = getLogHistory();
        expect(history[0].level).toBe(LogLevel.ERROR);
      });

      it('should log error messages with data and error object', () => {
        const logger = createScopedLogger('Test');
        const data = { taskId: '123' };
        const error = new Error('Critical failure');
        logger.error('Error with details', data, error);

        expect(mockConsoleError).toHaveBeenCalled();
        const history = getLogHistory();
        expect(history[0].data).toEqual(data);
        expect(history[0].error).toBe(error);
      });
    });

    describe('success method', () => {
      it('should log success messages at INFO level', () => {
        const logger = createScopedLogger('Test');
        logger.success('Operation completed');

        expect(mockConsoleInfo).toHaveBeenCalled();
        const history = getLogHistory();
        expect(history[0].level).toBe(LogLevel.INFO);
        expect(history[0].message).toContain('Operation completed');
      });

      it('should prefix success messages with checkmark', () => {
        const logger = createScopedLogger('Test');
        logger.success('Task done');

        const history = getLogHistory();
        expect(history[0].message).toMatch(/^.+ Task done$/);
      });
    });

    describe('progress method', () => {
      it('should log progress with current/total and percentage', () => {
        const logger = createScopedLogger('Test');
        logger.progress(5, 10, 'Processing items');

        expect(mockConsoleInfo).toHaveBeenCalled();
        const history = getLogHistory();
        expect(history[0].message).toContain('[5/10]');
        expect(history[0].message).toContain('(50%)');
        expect(history[0].message).toContain('Processing items');
      });

      it('should handle zero total gracefully', () => {
        const logger = createScopedLogger('Test');
        logger.progress(0, 0, 'Empty progress');

        const history = getLogHistory();
        expect(history[0].message).toContain('[0/0]');
        expect(history[0].message).toContain('(0%)');
      });

      it('should calculate percentage correctly', () => {
        const logger = createScopedLogger('Test');
        logger.progress(1, 3, 'One third');

        const history = getLogHistory();
        expect(history[0].message).toContain('(33%)');
      });
    });

    describe('metric method', () => {
      it('should log metric with name and value', () => {
        const logger = createScopedLogger('Test');
        logger.metric('requests_count', 100);

        expect(mockConsoleInfo).toHaveBeenCalled();
        const history = getLogHistory();
        expect(history[0].message).toContain('METRIC');
        expect(history[0].message).toContain('requests_count');
        expect(history[0].message).toContain('100');
      });

      it('should log metric with unit', () => {
        const logger = createScopedLogger('Test');
        logger.metric('response_time', 250, 'ms');

        const history = getLogHistory();
        expect(history[0].message).toContain('250ms');
      });

      it('should log metric with tags', () => {
        const logger = createScopedLogger('Test');
        const tags = { videoId: 'abc123', status: 'success' };
        logger.metric('task_duration', 500, 'ms', tags);

        const history = getLogHistory();
        expect(history[0].data).toEqual(
          expect.objectContaining({
            metricName: 'task_duration',
            value: 500,
            unit: 'ms',
            tags
          })
        );
      });
    });

    describe('startTimer / endTimer', () => {
      beforeEach(() => {
        vi.useFakeTimers();
        setLogLevel(LogLevel.DEBUG);
      });

      afterEach(() => {
        vi.useRealTimers();
      });

      it('should track timer start', () => {
        const logger = createScopedLogger('Test');
        logger.startTimer('myTimer');

        const history = getLogHistory();
        expect(history.some(h => h.message.includes('Timer started: myTimer'))).toBe(true);
      });

      it('should return duration when ending timer', () => {
        const logger = createScopedLogger('Test');
        logger.startTimer('myTimer');

        // Advance time by 100ms
        vi.advanceTimersByTime(100);

        const duration = logger.endTimer('myTimer');
        expect(duration).toBeGreaterThanOrEqual(0);
      });

      it('should log warning when ending non-existent timer', () => {
        const logger = createScopedLogger('Test');
        const duration = logger.endTimer('nonExistentTimer');

        expect(duration).toBe(0);
        const history = getLogHistory();
        expect(history.some(h =>
          h.level === LogLevel.WARN && h.message.includes('Timer not found')
        )).toBe(true);
      });

      it('should log duration when timer ends', () => {
        const logger = createScopedLogger('Test');
        logger.startTimer('testTimer');
        logger.endTimer('testTimer');

        const history = getLogHistory();
        expect(history.some(h => h.message.includes('Timer ended: testTimer'))).toBe(true);
      });
    });
  });

  describe('Log entry structure', () => {
    it('should create entries with correct structure', () => {
      const logger = createScopedLogger('TestContext');
      logger.info('Test message', { key: 'value' });

      const history = getLogHistory();
      const entry = history[0];

      expect(entry).toHaveProperty('timestamp');
      expect(entry).toHaveProperty('level');
      expect(entry).toHaveProperty('context');
      expect(entry).toHaveProperty('message');
      expect(entry).toHaveProperty('data');

      expect(typeof entry.timestamp).toBe('number');
      expect(entry.level).toBe(LogLevel.INFO);
      expect(entry.context).toBe('TestContext');
      expect(entry.message).toBe('Test message');
      expect(entry.data).toEqual({ key: 'value' });
    });

    it('should set timestamp to current time', () => {
      const beforeTime = Date.now();
      const logger = createScopedLogger('Test');
      logger.info('Test');
      const afterTime = Date.now();

      const history = getLogHistory();
      const timestamp = history[0].timestamp;

      expect(timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(timestamp).toBeLessThanOrEqual(afterTime);
    });
  });

  describe('Log level filtering', () => {
    it('should not output DEBUG when level is INFO', () => {
      setLogLevel(LogLevel.INFO);
      const logger = createScopedLogger('Test');
      logger.debug('Debug message');

      expect(mockConsoleDebug).not.toHaveBeenCalled();
    });

    it('should not output INFO when level is WARN', () => {
      setLogLevel(LogLevel.WARN);
      const logger = createScopedLogger('Test');
      logger.info('Info message');

      expect(mockConsoleInfo).not.toHaveBeenCalled();
    });

    it('should not output WARN when level is ERROR', () => {
      setLogLevel(LogLevel.ERROR);
      const logger = createScopedLogger('Test');
      logger.warn('Warning message');

      expect(mockConsoleWarn).not.toHaveBeenCalled();
    });

    it('should not output any messages when level is NONE', () => {
      setLogLevel(LogLevel.NONE);
      const logger = createScopedLogger('Test');

      logger.debug('Debug');
      logger.info('Info');
      logger.warn('Warning');
      logger.error('Error');

      expect(mockConsoleDebug).not.toHaveBeenCalled();
      expect(mockConsoleInfo).not.toHaveBeenCalled();
      expect(mockConsoleWarn).not.toHaveBeenCalled();
      expect(mockConsoleError).not.toHaveBeenCalled();
    });

    it('should still add entries to history regardless of log level', () => {
      setLogLevel(LogLevel.NONE);
      const logger = createScopedLogger('Test');

      logger.debug('Debug');
      logger.info('Info');
      logger.warn('Warning');
      logger.error('Error');

      const history = getLogHistory();
      expect(history.length).toBe(4);
    });
  });

  describe('Log history size limit', () => {
    it('should limit history to 100 entries', () => {
      const logger = createScopedLogger('Test');

      // Add 110 log entries
      for (let i = 0; i < 110; i++) {
        logger.info(`Message ${i}`);
      }

      const history = getLogHistory();
      expect(history.length).toBe(100);
    });

    it('should remove oldest entries when limit is reached', () => {
      const logger = createScopedLogger('Test');

      // Add 110 log entries
      for (let i = 0; i < 110; i++) {
        logger.info(`Message ${i}`);
      }

      const history = getLogHistory();
      // First entry should be Message 10 (oldest 10 were removed)
      expect(history[0].message).toBe('Message 10');
      // Last entry should be Message 109
      expect(history[history.length - 1].message).toBe('Message 109');
    });
  });

  describe('Pre-created loggers', () => {
    it('should export backgroundWorkerLogger', () => {
      expect(backgroundWorkerLogger).toBeDefined();
      expect(typeof backgroundWorkerLogger.info).toBe('function');
    });

    it('should export replyQueueLogger', () => {
      expect(replyQueueLogger).toBeDefined();
      expect(typeof replyQueueLogger.info).toBe('function');
    });

    it('should export taskExecutorLogger', () => {
      expect(taskExecutorLogger).toBeDefined();
      expect(typeof taskExecutorLogger.info).toBe('function');
    });

    it('should have correct context for backgroundWorkerLogger', () => {
      backgroundWorkerLogger.info('Test');
      const history = getLogHistory();
      expect(history[0].context).toBe('BackgroundWorker');
    });

    it('should have correct context for replyQueueLogger', () => {
      replyQueueLogger.info('Test');
      const history = getLogHistory();
      expect(history[0].context).toBe('ReplyQueueService');
    });

    it('should have correct context for taskExecutorLogger', () => {
      taskExecutorLogger.info('Test');
      const history = getLogHistory();
      expect(history[0].context).toBe('TaskExecutor');
    });
  });

  describe('ScopedLogger type', () => {
    it('should be assignable from createScopedLogger result', () => {
      const logger: ScopedLogger = createScopedLogger('Test');
      expect(logger).toBeDefined();
      expect(typeof logger.debug).toBe('function');
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.error).toBe('function');
    });
  });
});
