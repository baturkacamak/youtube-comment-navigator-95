/**
 * Tests for Background Worker
 * Tests for addTask, addBatchTasks, cancelVideoTasks, getQueueStats, handleMessage
 */

import {
  addTask,
  addBatchTasks,
  cancelVideoTasks,
  getQueueStats,
  handleMessage,
  updateConfig,
  getConfig,
  clearAllQueues,
  resetRateLimitState,
  PreparedRequest,
  ErrorCode
} from './backgroundWorker';
import { MessageType, TaskStatus, DEFAULT_WORKER_POOL_CONFIG } from '../../types/queueTypes';
import { clearLogHistory, setLogLevel, LogLevel } from './queueLogger';

// Mock the chrome API
const mockChrome = {
  runtime: {
    lastError: null as { message: string } | null,
    onMessage: {
      addListener: vi.fn()
    }
  },
  tabs: {
    sendMessage: vi.fn().mockImplementation(() => Promise.resolve()),
    query: vi.fn().mockImplementation((query, callback) => {
      callback([{ id: 1, active: true }]);
    })
  }
};

// Setup chrome global
vi.stubGlobal('chrome', mockChrome);

// Mock fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('backgroundWorker', () => {
  // Valid test data
  const validVideoId = 'abc12345678';
  const validParentCommentId = 'UgyrandomcommentidXXX';
  const validContinuationToken = 'EhYSC2FiYzEyMzQ1Njc4GAYyDhoA';

  const validPreparedRequest: PreparedRequest = {
    url: 'https://www.youtube.com/youtubei/v1/next?replies=true',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-youtube-client-name': '1'
    },
    body: JSON.stringify({ continuation: validContinuationToken })
  };

  beforeEach(() => {
    // Clear all state before each test
    clearAllQueues();
    resetRateLimitState();
    clearLogHistory();
    setLogLevel(LogLevel.NONE); // Suppress console output during tests

    // Reset config to defaults
    updateConfig(DEFAULT_WORKER_POOL_CONFIG);

    // Reset mocks
    vi.clearAllMocks();
    mockChrome.runtime.lastError = null;
    mockFetch.mockReset();
  });

  describe('addTask', () => {
    it('should add a valid task and return task ID', () => {
      const taskId = addTask(
        validVideoId,
        validParentCommentId,
        validContinuationToken,
        validPreparedRequest
      );

      expect(taskId).toBeDefined();
      expect(typeof taskId).toBe('string');
      expect(taskId).toMatch(/^task_/);
    });

    it('should add task with tab ID', () => {
      const tabId = 42;
      const taskId = addTask(
        validVideoId,
        validParentCommentId,
        validContinuationToken,
        validPreparedRequest,
        tabId
      );

      expect(taskId).toBeDefined();

      const stats = getQueueStats(validVideoId);
      expect(stats.totalTasks).toBe(1);
    });

    it('should throw error for invalid video ID - too short', () => {
      expect(() => {
        addTask(
          'abc123', // Too short
          validParentCommentId,
          validContinuationToken,
          validPreparedRequest
        );
      }).toThrow('Invalid video ID');
    });

    it('should throw error for invalid video ID - too long', () => {
      expect(() => {
        addTask(
          'abc12345678901234', // Too long
          validParentCommentId,
          validContinuationToken,
          validPreparedRequest
        );
      }).toThrow('Invalid video ID');
    });

    it('should throw error for invalid video ID - invalid characters', () => {
      expect(() => {
        addTask(
          'abc!@#$%^&*()', // Invalid characters
          validParentCommentId,
          validContinuationToken,
          validPreparedRequest
        );
      }).toThrow('Invalid video ID');
    });

    it('should throw error for empty video ID', () => {
      expect(() => {
        addTask(
          '',
          validParentCommentId,
          validContinuationToken,
          validPreparedRequest
        );
      }).toThrow('Invalid video ID');
    });

    it('should throw error for empty parent comment ID', () => {
      expect(() => {
        addTask(
          validVideoId,
          '',
          validContinuationToken,
          validPreparedRequest
        );
      }).toThrow('Invalid parent comment ID');
    });

    it('should throw error for empty continuation token', () => {
      expect(() => {
        addTask(
          validVideoId,
          validParentCommentId,
          '',
          validPreparedRequest
        );
      }).toThrow('Invalid continuation token');
    });

    it('should throw error for invalid prepared request - missing url', () => {
      const invalidRequest = {
        method: 'POST',
        headers: {},
        body: ''
      } as PreparedRequest;

      expect(() => {
        addTask(
          validVideoId,
          validParentCommentId,
          validContinuationToken,
          invalidRequest
        );
      }).toThrow('Invalid prepared request');
    });

    it('should throw error for invalid prepared request - missing method', () => {
      const invalidRequest = {
        url: 'https://example.com',
        headers: {},
        body: ''
      } as PreparedRequest;

      expect(() => {
        addTask(
          validVideoId,
          validParentCommentId,
          validContinuationToken,
          invalidRequest
        );
      }).toThrow('Invalid prepared request');
    });

    it('should throw error for invalid prepared request - missing headers', () => {
      const invalidRequest = {
        url: 'https://example.com',
        method: 'POST',
        body: ''
      } as PreparedRequest;

      expect(() => {
        addTask(
          validVideoId,
          validParentCommentId,
          validContinuationToken,
          invalidRequest
        );
      }).toThrow('Invalid prepared request');
    });

    it('should increment queue size when adding tasks', () => {
      addTask(validVideoId, validParentCommentId, validContinuationToken, validPreparedRequest);
      expect(getQueueStats(validVideoId).totalTasks).toBe(1);

      addTask(validVideoId, 'comment2', validContinuationToken, validPreparedRequest);
      expect(getQueueStats(validVideoId).totalTasks).toBe(2);

      addTask(validVideoId, 'comment3', validContinuationToken, validPreparedRequest);
      expect(getQueueStats(validVideoId).totalTasks).toBe(3);
    });

    it('should create separate queues for different videos', () => {
      const videoId1 = 'abc12345678';
      const videoId2 = 'xyz98765432';

      addTask(videoId1, validParentCommentId, validContinuationToken, validPreparedRequest);
      addTask(videoId2, validParentCommentId, validContinuationToken, validPreparedRequest);

      expect(getQueueStats(videoId1).totalTasks).toBe(1);
      expect(getQueueStats(videoId2).totalTasks).toBe(1);
    });

    it('should generate unique task IDs', () => {
      const taskIds = new Set<string>();

      for (let i = 0; i < 100; i++) {
        const taskId = addTask(
          validVideoId,
          `comment_${i}`,
          validContinuationToken,
          validPreparedRequest
        );
        taskIds.add(taskId);
      }

      expect(taskIds.size).toBe(100);
    });
  });

  describe('addBatchTasks', () => {
    it('should add multiple tasks at once', () => {
      const tasks = [
        {
          videoId: validVideoId,
          parentCommentId: 'comment1',
          continuationToken: validContinuationToken,
          preparedRequest: validPreparedRequest
        },
        {
          videoId: validVideoId,
          parentCommentId: 'comment2',
          continuationToken: validContinuationToken,
          preparedRequest: validPreparedRequest
        },
        {
          videoId: validVideoId,
          parentCommentId: 'comment3',
          continuationToken: validContinuationToken,
          preparedRequest: validPreparedRequest
        }
      ];

      const taskIds = addBatchTasks(tasks);

      expect(taskIds).toHaveLength(3);
      expect(getQueueStats(validVideoId).totalTasks).toBe(3);
    });

    it('should return empty array for empty tasks array', () => {
      const taskIds = addBatchTasks([]);
      expect(taskIds).toEqual([]);
    });

    it('should skip invalid tasks and add valid ones', () => {
      const tasks = [
        {
          videoId: validVideoId,
          parentCommentId: 'comment1',
          continuationToken: validContinuationToken,
          preparedRequest: validPreparedRequest
        },
        {
          videoId: 'invalid', // Invalid video ID
          parentCommentId: 'comment2',
          continuationToken: validContinuationToken,
          preparedRequest: validPreparedRequest
        },
        {
          videoId: validVideoId,
          parentCommentId: 'comment3',
          continuationToken: validContinuationToken,
          preparedRequest: validPreparedRequest
        }
      ];

      const taskIds = addBatchTasks(tasks);

      expect(taskIds).toHaveLength(2);
      expect(getQueueStats(validVideoId).totalTasks).toBe(2);
    });

    it('should handle tasks for multiple videos', () => {
      const videoId1 = 'abc12345678';
      const videoId2 = 'xyz98765432';

      const tasks = [
        {
          videoId: videoId1,
          parentCommentId: 'comment1',
          continuationToken: validContinuationToken,
          preparedRequest: validPreparedRequest
        },
        {
          videoId: videoId2,
          parentCommentId: 'comment2',
          continuationToken: validContinuationToken,
          preparedRequest: validPreparedRequest
        }
      ];

      const taskIds = addBatchTasks(tasks);

      expect(taskIds).toHaveLength(2);
      expect(getQueueStats(videoId1).totalTasks).toBe(1);
      expect(getQueueStats(videoId2).totalTasks).toBe(1);
    });

    it('should add tab ID to all tasks', () => {
      const tabId = 123;
      const tasks = [
        {
          videoId: validVideoId,
          parentCommentId: 'comment1',
          continuationToken: validContinuationToken,
          preparedRequest: validPreparedRequest
        }
      ];

      const taskIds = addBatchTasks(tasks, tabId);
      expect(taskIds).toHaveLength(1);
    });

    it('should skip task with missing parent comment ID', () => {
      const tasks = [
        {
          videoId: validVideoId,
          parentCommentId: '',
          continuationToken: validContinuationToken,
          preparedRequest: validPreparedRequest
        }
      ];

      const taskIds = addBatchTasks(tasks);
      expect(taskIds).toHaveLength(0);
    });

    it('should skip task with missing continuation token', () => {
      const tasks = [
        {
          videoId: validVideoId,
          parentCommentId: 'comment1',
          continuationToken: '',
          preparedRequest: validPreparedRequest
        }
      ];

      const taskIds = addBatchTasks(tasks);
      expect(taskIds).toHaveLength(0);
    });

    it('should skip task with invalid prepared request', () => {
      const tasks = [
        {
          videoId: validVideoId,
          parentCommentId: 'comment1',
          continuationToken: validContinuationToken,
          preparedRequest: { url: '', method: '', headers: {}, body: '' }
        }
      ];

      const taskIds = addBatchTasks(tasks);
      expect(taskIds).toHaveLength(0);
    });
  });

  describe('cancelVideoTasks', () => {
    it('should cancel all tasks for a video', () => {
      addTask(validVideoId, 'comment1', validContinuationToken, validPreparedRequest);
      addTask(validVideoId, 'comment2', validContinuationToken, validPreparedRequest);

      cancelVideoTasks(validVideoId);

      const stats = getQueueStats(validVideoId);
      expect(stats.totalTasks).toBe(0);
    });

    it('should not affect tasks for other videos', () => {
      const videoId1 = 'abc12345678';
      const videoId2 = 'xyz98765432';

      addTask(videoId1, 'comment1', validContinuationToken, validPreparedRequest);
      addTask(videoId2, 'comment2', validContinuationToken, validPreparedRequest);

      cancelVideoTasks(videoId1);

      expect(getQueueStats(videoId1).totalTasks).toBe(0);
      expect(getQueueStats(videoId2).totalTasks).toBe(1);
    });

    it('should handle cancellation of non-existent video', () => {
      expect(() => {
        cancelVideoTasks('nonexistent1');
      }).not.toThrow();
    });

    it('should handle empty videoId gracefully', () => {
      expect(() => {
        cancelVideoTasks('');
      }).not.toThrow();
    });
  });

  describe('getQueueStats', () => {
    it('should return stats for a specific video', () => {
      addTask(validVideoId, 'comment1', validContinuationToken, validPreparedRequest);
      addTask(validVideoId, 'comment2', validContinuationToken, validPreparedRequest);

      const stats = getQueueStats(validVideoId);

      expect(stats.totalTasks).toBe(2);
      expect(stats.pendingTasks).toBe(2);
      expect(stats.inProgressTasks).toBe(0);
      expect(stats.completedTasks).toBe(0);
      expect(stats.failedTasks).toBe(0);
      expect(stats.totalRepliesFetched).toBe(0);
      expect(stats.isRateLimited).toBe(false);
      expect(stats.currentConcurrency).toBe(0);
    });

    it('should return aggregated stats when no videoId is provided', () => {
      const videoId1 = 'abc12345678';
      const videoId2 = 'xyz98765432';

      addTask(videoId1, 'comment1', validContinuationToken, validPreparedRequest);
      addTask(videoId1, 'comment2', validContinuationToken, validPreparedRequest);
      addTask(videoId2, 'comment3', validContinuationToken, validPreparedRequest);

      const stats = getQueueStats();

      expect(stats.totalTasks).toBe(3);
      expect(stats.pendingTasks).toBe(3);
    });

    it('should return empty stats for non-existent video', () => {
      const stats = getQueueStats('nonexistent1');

      expect(stats.totalTasks).toBe(0);
      expect(stats.pendingTasks).toBe(0);
      expect(stats.inProgressTasks).toBe(0);
      expect(stats.completedTasks).toBe(0);
      expect(stats.failedTasks).toBe(0);
    });

    it('should return correct structure', () => {
      const stats = getQueueStats(validVideoId);

      expect(stats).toHaveProperty('totalTasks');
      expect(stats).toHaveProperty('pendingTasks');
      expect(stats).toHaveProperty('inProgressTasks');
      expect(stats).toHaveProperty('completedTasks');
      expect(stats).toHaveProperty('failedTasks');
      expect(stats).toHaveProperty('totalRepliesFetched');
      expect(stats).toHaveProperty('isRateLimited');
      expect(stats).toHaveProperty('currentConcurrency');
    });
  });

  describe('handleMessage', () => {
    const createMockSender = (tabId?: number): chrome.runtime.MessageSender => ({
      tab: tabId ? { id: tabId } as chrome.tabs.Tab : undefined
    });

    describe('QUEUE_REPLY_FETCH', () => {
      it('should handle valid queue reply fetch message', () => {
        const sendResponse = vi.fn();
        const message = {
          type: MessageType.QUEUE_REPLY_FETCH,
          task: {
            videoId: validVideoId,
            parentCommentId: validParentCommentId,
            continuationToken: validContinuationToken,
            preparedRequest: validPreparedRequest
          }
        };

        const result = handleMessage(message, createMockSender(1), sendResponse);

        expect(result).toBe(true);
        expect(sendResponse).toHaveBeenCalledWith(expect.objectContaining({
          taskId: expect.any(String)
        }));
      });

      it('should return error for missing task data', () => {
        const sendResponse = vi.fn();
        const message = {
          type: MessageType.QUEUE_REPLY_FETCH
        };

        handleMessage(message, createMockSender(1), sendResponse);

        expect(sendResponse).toHaveBeenCalledWith({ error: 'Missing task data' });
      });

      it('should return error for invalid video ID', () => {
        const sendResponse = vi.fn();
        const message = {
          type: MessageType.QUEUE_REPLY_FETCH,
          task: {
            videoId: 'invalid',
            parentCommentId: validParentCommentId,
            continuationToken: validContinuationToken,
            preparedRequest: validPreparedRequest
          }
        };

        handleMessage(message, createMockSender(1), sendResponse);

        expect(sendResponse).toHaveBeenCalledWith(expect.objectContaining({
          error: expect.stringContaining('Invalid video ID')
        }));
      });
    });

    describe('QUEUE_BATCH_REPLY_FETCH', () => {
      it('should handle valid batch queue message', () => {
        const sendResponse = vi.fn();
        const message = {
          type: MessageType.QUEUE_BATCH_REPLY_FETCH,
          tasks: [
            {
              videoId: validVideoId,
              parentCommentId: 'comment1',
              continuationToken: validContinuationToken,
              preparedRequest: validPreparedRequest
            },
            {
              videoId: validVideoId,
              parentCommentId: 'comment2',
              continuationToken: validContinuationToken,
              preparedRequest: validPreparedRequest
            }
          ]
        };

        const result = handleMessage(message, createMockSender(1), sendResponse);

        expect(result).toBe(true);
        expect(sendResponse).toHaveBeenCalledWith(expect.objectContaining({
          taskIds: expect.any(Array)
        }));
        expect(sendResponse.mock.calls[0][0].taskIds).toHaveLength(2);
      });

      it('should return error for invalid tasks array', () => {
        const sendResponse = vi.fn();
        const message = {
          type: MessageType.QUEUE_BATCH_REPLY_FETCH,
          tasks: 'not an array'
        };

        handleMessage(message, createMockSender(1), sendResponse);

        expect(sendResponse).toHaveBeenCalledWith({
          error: 'Invalid tasks array',
          taskIds: []
        });
      });
    });

    describe('CANCEL_VIDEO_TASKS', () => {
      it('should handle cancel video tasks message', () => {
        addTask(validVideoId, validParentCommentId, validContinuationToken, validPreparedRequest);

        const sendResponse = vi.fn();
        const message = {
          type: MessageType.CANCEL_VIDEO_TASKS,
          videoId: validVideoId
        };

        const result = handleMessage(message, createMockSender(1), sendResponse);

        expect(result).toBe(true);
        expect(sendResponse).toHaveBeenCalledWith({ success: true });
        expect(getQueueStats(validVideoId).totalTasks).toBe(0);
      });

      it('should return error for missing videoId', () => {
        const sendResponse = vi.fn();
        const message = {
          type: MessageType.CANCEL_VIDEO_TASKS
        };

        handleMessage(message, createMockSender(1), sendResponse);

        expect(sendResponse).toHaveBeenCalledWith({
          error: 'Missing videoId',
          success: false
        });
      });
    });

    describe('GET_QUEUE_STATUS', () => {
      it('should return queue stats for specific video', () => {
        addTask(validVideoId, 'comment1', validContinuationToken, validPreparedRequest);
        addTask(validVideoId, 'comment2', validContinuationToken, validPreparedRequest);

        const sendResponse = vi.fn();
        const message = {
          type: MessageType.GET_QUEUE_STATUS,
          videoId: validVideoId
        };

        const result = handleMessage(message, createMockSender(1), sendResponse);

        expect(result).toBe(true);
        expect(sendResponse).toHaveBeenCalledWith(expect.objectContaining({
          totalTasks: 2,
          pendingTasks: 2
        }));
      });

      it('should return aggregated stats when no videoId provided', () => {
        addTask('abc12345678', 'comment1', validContinuationToken, validPreparedRequest);
        addTask('xyz98765432', 'comment2', validContinuationToken, validPreparedRequest);

        const sendResponse = vi.fn();
        const message = {
          type: MessageType.GET_QUEUE_STATUS
        };

        handleMessage(message, createMockSender(1), sendResponse);

        expect(sendResponse).toHaveBeenCalledWith(expect.objectContaining({
          totalTasks: 2
        }));
      });
    });

    describe('Unknown message types', () => {
      it('should return false for unknown message type', () => {
        const sendResponse = vi.fn();
        const message = {
          type: 'UNKNOWN_TYPE'
        };

        const result = handleMessage(message, createMockSender(1), sendResponse);

        expect(result).toBe(false);
        expect(sendResponse).not.toHaveBeenCalled();
      });

      it('should handle null message gracefully', () => {
        const sendResponse = vi.fn();

        const result = handleMessage(null, createMockSender(1), sendResponse);

        expect(result).toBe(false);
      });

      it('should handle undefined message gracefully', () => {
        const sendResponse = vi.fn();

        const result = handleMessage(undefined, createMockSender(1), sendResponse);

        expect(result).toBe(false);
      });
    });
  });

  describe('updateConfig / getConfig', () => {
    it('should update configuration', () => {
      updateConfig({ maxConcurrency: 5 });

      const config = getConfig();
      expect(config.maxConcurrency).toBe(5);
    });

    it('should merge with existing config', () => {
      updateConfig({ maxConcurrency: 5 });
      updateConfig({ retryLimit: 5 });

      const config = getConfig();
      expect(config.maxConcurrency).toBe(5);
      expect(config.retryLimit).toBe(5);
    });

    it('should return a copy of config', () => {
      const config1 = getConfig();
      const config2 = getConfig();

      expect(config1).not.toBe(config2);
      expect(config1).toEqual(config2);
    });

    it('should accept partial config updates', () => {
      updateConfig({ taskTimeoutMs: 60000 });

      const config = getConfig();
      expect(config.taskTimeoutMs).toBe(60000);
      // Other values should remain at defaults
      expect(config.retryDelayMs).toBe(DEFAULT_WORKER_POOL_CONFIG.retryDelayMs);
    });
  });

  describe('clearAllQueues', () => {
    it('should clear all queues', () => {
      addTask('abc12345678', 'comment1', validContinuationToken, validPreparedRequest);
      addTask('xyz98765432', 'comment2', validContinuationToken, validPreparedRequest);

      clearAllQueues();

      expect(getQueueStats().totalTasks).toBe(0);
    });

    it('should not throw when no queues exist', () => {
      expect(() => clearAllQueues()).not.toThrow();
    });
  });

  describe('resetRateLimitState', () => {
    it('should reset rate limit state', () => {
      // First, simulate a rate limited state by updating config
      updateConfig({ maxConcurrency: 1 });

      resetRateLimitState();

      const stats = getQueueStats();
      expect(stats.isRateLimited).toBe(false);
    });

    it('should restore original max concurrency', () => {
      // First reset everything to a clean state
      resetRateLimitState();

      const originalConcurrency = 5;
      // Set the original concurrency - this also sets the originalMaxConcurrency internal variable
      updateConfig({ maxConcurrency: originalConcurrency });

      // Now reset rate limit state - should maintain the same concurrency
      resetRateLimitState();

      const config = getConfig();
      expect(config.maxConcurrency).toBe(originalConcurrency);
    });
  });

  describe('ErrorCode enum', () => {
    it('should have all expected error codes', () => {
      expect(ErrorCode.NETWORK_ERROR).toBe('NETWORK_ERROR');
      expect(ErrorCode.RATE_LIMITED).toBe('RATE_LIMITED');
      expect(ErrorCode.INVALID_RESPONSE).toBe('INVALID_RESPONSE');
      expect(ErrorCode.PARSE_ERROR).toBe('PARSE_ERROR');
      expect(ErrorCode.TIMEOUT).toBe('TIMEOUT');
      expect(ErrorCode.CANCELLED).toBe('CANCELLED');
      expect(ErrorCode.TAB_NOT_FOUND).toBe('TAB_NOT_FOUND');
      expect(ErrorCode.VALIDATION_ERROR).toBe('VALIDATION_ERROR');
      expect(ErrorCode.UNKNOWN).toBe('UNKNOWN');
    });
  });

  describe('Video ID validation', () => {
    it('should accept valid 11-character video ID', () => {
      const validIds = [
        'abc12345678',
        'ABC12345678',
        'a1b2c3d4e5f',
        'dQw4w9WgXcQ',
        '-_abcdefgh1',
        'a-b_c-d_e-1'
      ];

      for (const videoId of validIds) {
        expect(() => {
          addTask(videoId, validParentCommentId, validContinuationToken, validPreparedRequest);
        }).not.toThrow();
      }
    });

    it('should reject invalid video IDs', () => {
      const invalidIds = [
        '',
        'abc',
        'abc123456789012', // Too long
        'abc 123456', // Contains space
        'abc.123456', // Contains dot
        'abc@123456', // Contains @
        null,
        undefined
      ];

      for (const videoId of invalidIds) {
        expect(() => {
          addTask(videoId as string, validParentCommentId, validContinuationToken, validPreparedRequest);
        }).toThrow();
      }
    });
  });

  describe('PreparedRequest validation', () => {
    it('should accept valid prepared request', () => {
      const validRequests: PreparedRequest[] = [
        {
          url: 'https://www.youtube.com/api',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: '{}'
        },
        {
          url: 'https://example.com',
          method: 'GET',
          headers: {},
          body: ''
        }
      ];

      for (const request of validRequests) {
        expect(() => {
          addTask(validVideoId, validParentCommentId, validContinuationToken, request);
        }).not.toThrow();
      }
    });

    it('should reject null or undefined prepared request', () => {
      expect(() => {
        addTask(validVideoId, validParentCommentId, validContinuationToken, null as any);
      }).toThrow('Invalid prepared request');

      expect(() => {
        addTask(validVideoId, validParentCommentId, validContinuationToken, undefined as any);
      }).toThrow('Invalid prepared request');
    });
  });
});
