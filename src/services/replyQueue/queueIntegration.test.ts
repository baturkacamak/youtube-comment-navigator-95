/**
 * Integration Tests for Queue System
 * Tests the complete workflow of the queue system including
 * background worker and reply queue service interactions
 */

import { MessageType, TaskStatus, DEFAULT_WORKER_POOL_CONFIG, QueueStats } from '../../types/queueTypes';
import {
  addTask,
  addBatchTasks,
  cancelVideoTasks,
  getQueueStats,
  handleMessage,
  updateConfig,
  clearAllQueues,
  resetRateLimitState,
  PreparedRequest
} from './backgroundWorker';
import {
  LogLevel,
  setLogLevel,
  clearLogHistory,
  getLogHistory,
  createScopedLogger
} from './queueLogger';

// Mock chrome API for integration tests
const mockSendMessage = vi.fn();
const mockTabsSendMessage = vi.fn();
const mockTabsQuery = vi.fn();
const mockAddListener = vi.fn();

const mockChrome = {
  runtime: {
    lastError: null as { message: string } | null,
    sendMessage: mockSendMessage,
    onMessage: {
      addListener: mockAddListener
    }
  },
  tabs: {
    sendMessage: mockTabsSendMessage.mockImplementation(() => Promise.resolve()),
    query: mockTabsQuery.mockImplementation((query, callback) => {
      callback([{ id: 1, active: true }]);
    })
  }
};

vi.stubGlobal('chrome', mockChrome);

// Mock fetch for network requests
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('Queue System Integration Tests', () => {
  const validVideoId = 'abc12345678';
  const validParentCommentId = 'UgyrandomcommentidXXX';
  const validContinuationToken = 'EhYSC2FiYzEyMzQ1Njc4GAYyDhoA';

  const validPreparedRequest: PreparedRequest = {
    url: 'https://www.youtube.com/youtubei/v1/next?replies=true',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-youtube-client-name': '1',
      'x-youtube-client-version': '2.20240620.05.00'
    },
    body: JSON.stringify({
      context: { client: { clientName: '1', clientVersion: '2.20240620.05.00' } },
      continuation: validContinuationToken
    })
  };

  beforeEach(() => {
    // Reset all state
    clearAllQueues();
    resetRateLimitState();
    clearLogHistory();
    setLogLevel(LogLevel.DEBUG);
    updateConfig(DEFAULT_WORKER_POOL_CONFIG);

    // Reset mocks
    vi.clearAllMocks();
    mockChrome.runtime.lastError = null;
    mockFetch.mockReset();
  });

  describe('Complete task lifecycle', () => {
    it('should track task through pending -> queue stats', () => {
      // Add a task
      const taskId = addTask(
        validVideoId,
        validParentCommentId,
        validContinuationToken,
        validPreparedRequest
      );

      // Check initial stats
      const stats = getQueueStats(validVideoId);
      expect(stats.totalTasks).toBe(1);
      expect(stats.pendingTasks).toBe(1);
      expect(stats.inProgressTasks).toBe(0);
      expect(stats.completedTasks).toBe(0);
      expect(stats.failedTasks).toBe(0);

      // Verify task was created with correct ID format
      expect(taskId).toMatch(/^task_[a-z0-9]+_[a-z0-9]+$/);
    });

    it('should handle batch task addition with mixed validity', () => {
      const tasks = [
        {
          videoId: validVideoId,
          parentCommentId: 'comment1',
          continuationToken: validContinuationToken,
          preparedRequest: validPreparedRequest
        },
        {
          videoId: 'invalid', // Invalid
          parentCommentId: 'comment2',
          continuationToken: validContinuationToken,
          preparedRequest: validPreparedRequest
        },
        {
          videoId: validVideoId,
          parentCommentId: 'comment3',
          continuationToken: validContinuationToken,
          preparedRequest: validPreparedRequest
        },
        {
          videoId: validVideoId,
          parentCommentId: '', // Invalid - empty
          continuationToken: validContinuationToken,
          preparedRequest: validPreparedRequest
        },
        {
          videoId: validVideoId,
          parentCommentId: 'comment5',
          continuationToken: validContinuationToken,
          preparedRequest: validPreparedRequest
        }
      ];

      const taskIds = addBatchTasks(tasks);

      // Should only have 3 valid tasks
      expect(taskIds).toHaveLength(3);

      const stats = getQueueStats(validVideoId);
      expect(stats.totalTasks).toBe(3);
    });

    it('should cancel tasks and clean up resources', () => {
      // Add multiple tasks
      addTask(validVideoId, 'comment1', validContinuationToken, validPreparedRequest);
      addTask(validVideoId, 'comment2', validContinuationToken, validPreparedRequest);
      addTask(validVideoId, 'comment3', validContinuationToken, validPreparedRequest);

      expect(getQueueStats(validVideoId).totalTasks).toBe(3);

      // Cancel all tasks
      cancelVideoTasks(validVideoId);

      // All tasks should be cleaned up
      const stats = getQueueStats(validVideoId);
      expect(stats.totalTasks).toBe(0);
      expect(stats.pendingTasks).toBe(0);
    });
  });

  describe('Message handler workflow', () => {
    const createMockSender = (tabId?: number): chrome.runtime.MessageSender => ({
      tab: tabId ? { id: tabId } as chrome.tabs.Tab : undefined
    });

    it('should handle complete task queue workflow via messages', () => {
      const sendResponse = vi.fn();

      // 1. Queue a task
      handleMessage(
        {
          type: MessageType.QUEUE_REPLY_FETCH,
          task: {
            videoId: validVideoId,
            parentCommentId: validParentCommentId,
            continuationToken: validContinuationToken,
            preparedRequest: validPreparedRequest
          }
        },
        createMockSender(1),
        sendResponse
      );

      expect(sendResponse).toHaveBeenCalledWith(
        expect.objectContaining({ taskId: expect.any(String) })
      );

      // 2. Check queue status
      sendResponse.mockClear();
      handleMessage(
        {
          type: MessageType.GET_QUEUE_STATUS,
          videoId: validVideoId
        },
        createMockSender(1),
        sendResponse
      );

      expect(sendResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          totalTasks: 1,
          pendingTasks: 1
        })
      );

      // 3. Cancel tasks
      sendResponse.mockClear();
      handleMessage(
        {
          type: MessageType.CANCEL_VIDEO_TASKS,
          videoId: validVideoId
        },
        createMockSender(1),
        sendResponse
      );

      expect(sendResponse).toHaveBeenCalledWith({ success: true });

      // 4. Verify cancellation
      sendResponse.mockClear();
      handleMessage(
        {
          type: MessageType.GET_QUEUE_STATUS,
          videoId: validVideoId
        },
        createMockSender(1),
        sendResponse
      );

      expect(sendResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          totalTasks: 0
        })
      );
    });

    it('should handle batch task queue workflow', () => {
      const sendResponse = vi.fn();

      // Queue batch tasks
      handleMessage(
        {
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
        },
        createMockSender(1),
        sendResponse
      );

      expect(sendResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          taskIds: expect.any(Array)
        })
      );

      const response = sendResponse.mock.calls[0][0];
      expect(response.taskIds).toHaveLength(2);
    });

    it('should propagate errors correctly in message handler', () => {
      const sendResponse = vi.fn();

      // Try to add task with invalid data
      handleMessage(
        {
          type: MessageType.QUEUE_REPLY_FETCH,
          task: {
            videoId: 'bad', // Invalid
            parentCommentId: validParentCommentId,
            continuationToken: validContinuationToken,
            preparedRequest: validPreparedRequest
          }
        },
        createMockSender(1),
        sendResponse
      );

      expect(sendResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('Invalid video ID')
        })
      );
    });
  });

  describe('Multi-video queue management', () => {
    const videoId1 = 'abc12345678';
    const videoId2 = 'xyz98765432';
    const videoId3 = 'def11111111';

    it('should manage independent queues for multiple videos', () => {
      // Add tasks to different videos
      addTask(videoId1, 'comment1', validContinuationToken, validPreparedRequest);
      addTask(videoId1, 'comment2', validContinuationToken, validPreparedRequest);
      addTask(videoId2, 'comment3', validContinuationToken, validPreparedRequest);
      addTask(videoId3, 'comment4', validContinuationToken, validPreparedRequest);
      addTask(videoId3, 'comment5', validContinuationToken, validPreparedRequest);
      addTask(videoId3, 'comment6', validContinuationToken, validPreparedRequest);

      // Check individual video stats
      expect(getQueueStats(videoId1).totalTasks).toBe(2);
      expect(getQueueStats(videoId2).totalTasks).toBe(1);
      expect(getQueueStats(videoId3).totalTasks).toBe(3);

      // Check aggregate stats
      const aggregateStats = getQueueStats();
      expect(aggregateStats.totalTasks).toBe(6);
    });

    it('should cancel only specific video tasks', () => {
      addTask(videoId1, 'comment1', validContinuationToken, validPreparedRequest);
      addTask(videoId2, 'comment2', validContinuationToken, validPreparedRequest);
      addTask(videoId3, 'comment3', validContinuationToken, validPreparedRequest);

      // Cancel only video2
      cancelVideoTasks(videoId2);

      expect(getQueueStats(videoId1).totalTasks).toBe(1);
      expect(getQueueStats(videoId2).totalTasks).toBe(0);
      expect(getQueueStats(videoId3).totalTasks).toBe(1);
      expect(getQueueStats().totalTasks).toBe(2);
    });

    it('should clear all queues at once', () => {
      addTask(videoId1, 'comment1', validContinuationToken, validPreparedRequest);
      addTask(videoId2, 'comment2', validContinuationToken, validPreparedRequest);
      addTask(videoId3, 'comment3', validContinuationToken, validPreparedRequest);

      clearAllQueues();

      expect(getQueueStats(videoId1).totalTasks).toBe(0);
      expect(getQueueStats(videoId2).totalTasks).toBe(0);
      expect(getQueueStats(videoId3).totalTasks).toBe(0);
      expect(getQueueStats().totalTasks).toBe(0);
    });
  });

  describe('Configuration management', () => {
    it('should apply configuration changes', () => {
      // Update concurrency
      updateConfig({ maxConcurrency: 5 });

      const stats = getQueueStats();
      expect(stats.currentConcurrency).toBe(0); // No active tasks

      // Add tasks - they should respect new config
      addTask(validVideoId, 'comment1', validContinuationToken, validPreparedRequest);

      expect(getQueueStats(validVideoId).totalTasks).toBe(1);
    });

    it('should reset rate limit state correctly', () => {
      // Update config and verify reset restores it
      updateConfig({ maxConcurrency: 10 });

      // Simulate rate limit by reducing concurrency
      updateConfig({ maxConcurrency: 1 });

      resetRateLimitState();

      // Should restore original concurrency
      expect(getQueueStats().isRateLimited).toBe(false);
    });
  });

  describe('Logger integration', () => {
    beforeEach(() => {
      setLogLevel(LogLevel.DEBUG);
      clearLogHistory();
    });

    it('should log task additions', () => {
      addTask(validVideoId, validParentCommentId, validContinuationToken, validPreparedRequest);

      const history = getLogHistory();
      const addedLog = history.find(entry =>
        entry.message.includes('Added task')
      );

      expect(addedLog).toBeDefined();
    });

    it('should log batch task additions', () => {
      addBatchTasks([
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
      ]);

      const history = getLogHistory();
      const batchLog = history.find(entry =>
        entry.message.includes('batch tasks')
      );

      expect(batchLog).toBeDefined();
    });

    it('should log cancellation', () => {
      addTask(validVideoId, validParentCommentId, validContinuationToken, validPreparedRequest);
      cancelVideoTasks(validVideoId);

      const history = getLogHistory();
      const cancelLog = history.find(entry =>
        entry.message.includes('Cancelled tasks')
      );

      expect(cancelLog).toBeDefined();
    });

    it('should log validation errors', () => {
      try {
        addTask('bad', validParentCommentId, validContinuationToken, validPreparedRequest);
      } catch (e) {
        // Expected to throw
      }

      const history = getLogHistory();
      const errorLog = history.find(entry =>
        entry.level === LogLevel.ERROR &&
        entry.message.includes('Invalid video ID')
      );

      expect(errorLog).toBeDefined();
    });

    it('should use scoped loggers with correct context', () => {
      const logger = createScopedLogger('IntegrationTest');
      logger.info('Test message', { data: 'value' });

      const history = getLogHistory();
      const testLog = history.find(entry =>
        entry.context === 'IntegrationTest' &&
        entry.message === 'Test message'
      );

      expect(testLog).toBeDefined();
      expect(testLog?.data).toEqual({ data: 'value' });
    });
  });

  describe('Error handling and edge cases', () => {
    it('should handle rapid task additions', () => {
      const taskIds: string[] = [];

      // Rapidly add many tasks
      for (let i = 0; i < 50; i++) {
        const taskId = addTask(
          validVideoId,
          `comment_${i}`,
          validContinuationToken,
          validPreparedRequest
        );
        taskIds.push(taskId);
      }

      // All should be unique
      const uniqueIds = new Set(taskIds);
      expect(uniqueIds.size).toBe(50);

      // All should be in queue
      expect(getQueueStats(validVideoId).totalTasks).toBe(50);
    });

    it('should handle rapid cancel and add cycles', () => {
      for (let cycle = 0; cycle < 5; cycle++) {
        // Add tasks
        addTask(validVideoId, 'comment1', validContinuationToken, validPreparedRequest);
        addTask(validVideoId, 'comment2', validContinuationToken, validPreparedRequest);

        expect(getQueueStats(validVideoId).totalTasks).toBe(2);

        // Cancel
        cancelVideoTasks(validVideoId);

        expect(getQueueStats(validVideoId).totalTasks).toBe(0);
      }
    });

    it('should not crash on concurrent operations', async () => {
      const operations: Promise<void>[] = [];

      // Simulate concurrent operations
      for (let i = 0; i < 20; i++) {
        operations.push(
          new Promise<void>((resolve) => {
            setTimeout(() => {
              addTask(
                validVideoId,
                `comment_${i}`,
                validContinuationToken,
                validPreparedRequest
              );
              resolve();
            }, Math.random() * 10);
          })
        );
      }

      await Promise.all(operations);

      const stats = getQueueStats(validVideoId);
      expect(stats.totalTasks).toBe(20);
    });

    it('should handle message handler with undefined sender tab', () => {
      const sendResponse = vi.fn();

      handleMessage(
        {
          type: MessageType.QUEUE_REPLY_FETCH,
          task: {
            videoId: validVideoId,
            parentCommentId: validParentCommentId,
            continuationToken: validContinuationToken,
            preparedRequest: validPreparedRequest
          }
        },
        { tab: undefined },
        sendResponse
      );

      expect(sendResponse).toHaveBeenCalledWith(
        expect.objectContaining({ taskId: expect.any(String) })
      );
    });
  });

  describe('Statistics accuracy', () => {
    it('should maintain accurate stats through operations', () => {
      // Initial state
      expect(getQueueStats().totalTasks).toBe(0);

      // Add tasks
      addTask(validVideoId, 'c1', validContinuationToken, validPreparedRequest);
      addTask(validVideoId, 'c2', validContinuationToken, validPreparedRequest);
      addTask(validVideoId, 'c3', validContinuationToken, validPreparedRequest);

      let stats = getQueueStats(validVideoId);
      expect(stats.totalTasks).toBe(3);
      expect(stats.pendingTasks).toBe(3);

      // Add batch tasks
      addBatchTasks([
        { videoId: validVideoId, parentCommentId: 'c4', continuationToken: validContinuationToken, preparedRequest: validPreparedRequest },
        { videoId: validVideoId, parentCommentId: 'c5', continuationToken: validContinuationToken, preparedRequest: validPreparedRequest }
      ]);

      stats = getQueueStats(validVideoId);
      expect(stats.totalTasks).toBe(5);
      expect(stats.pendingTasks).toBe(5);

      // Cancel video tasks
      cancelVideoTasks(validVideoId);

      stats = getQueueStats(validVideoId);
      expect(stats.totalTasks).toBe(0);
      expect(stats.pendingTasks).toBe(0);
    });

    it('should aggregate stats correctly across videos', () => {
      addTask('abc12345678', 'c1', validContinuationToken, validPreparedRequest);
      addTask('abc12345678', 'c2', validContinuationToken, validPreparedRequest);
      addTask('xyz98765432', 'c3', validContinuationToken, validPreparedRequest);
      addTask('def11111111', 'c4', validContinuationToken, validPreparedRequest);
      addTask('def11111111', 'c5', validContinuationToken, validPreparedRequest);
      addTask('def11111111', 'c6', validContinuationToken, validPreparedRequest);

      const aggregateStats = getQueueStats();
      expect(aggregateStats.totalTasks).toBe(6);
      expect(aggregateStats.pendingTasks).toBe(6);
      expect(aggregateStats.inProgressTasks).toBe(0);
      expect(aggregateStats.completedTasks).toBe(0);
      expect(aggregateStats.failedTasks).toBe(0);
    });
  });

  describe('Default configuration validation', () => {
    it('should have sensible default configuration', () => {
      updateConfig(DEFAULT_WORKER_POOL_CONFIG);

      expect(DEFAULT_WORKER_POOL_CONFIG.maxConcurrency).toBeGreaterThan(0);
      expect(DEFAULT_WORKER_POOL_CONFIG.maxConcurrency).toBeLessThanOrEqual(10);
      expect(DEFAULT_WORKER_POOL_CONFIG.retryLimit).toBeGreaterThan(0);
      expect(DEFAULT_WORKER_POOL_CONFIG.retryDelayMs).toBeGreaterThan(0);
      expect(DEFAULT_WORKER_POOL_CONFIG.rateLimitPauseMs).toBeGreaterThan(DEFAULT_WORKER_POOL_CONFIG.retryDelayMs);
      expect(DEFAULT_WORKER_POOL_CONFIG.taskTimeoutMs).toBeGreaterThan(DEFAULT_WORKER_POOL_CONFIG.rateLimitPauseMs);
    });
  });
});
