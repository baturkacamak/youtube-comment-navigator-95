/**
 * Tests for Queue Types
 * Tests for TaskStatus, MessageType enums and DEFAULT_WORKER_POOL_CONFIG
 */

import {
  TaskStatus,
  MessageType,
  DEFAULT_WORKER_POOL_CONFIG,
  WorkerPoolConfig,
  ReplyFetchTask,
  QueueStats,
  QueueReplyFetchMessage,
  QueueBatchReplyFetchMessage,
  CancelVideoTasksMessage,
  GetQueueStatusMessage,
  TaskCompletedMessage,
  TaskFailedMessage,
  QueueStatusUpdateMessage,
  RateLimitedMessage,
  AllTasksCompletedMessage
} from './queueTypes';

describe('queueTypes', () => {
  describe('TaskStatus enum', () => {
    it('should have PENDING status', () => {
      expect(TaskStatus.PENDING).toBe('pending');
    });

    it('should have IN_PROGRESS status', () => {
      expect(TaskStatus.IN_PROGRESS).toBe('in_progress');
    });

    it('should have COMPLETED status', () => {
      expect(TaskStatus.COMPLETED).toBe('completed');
    });

    it('should have FAILED status', () => {
      expect(TaskStatus.FAILED).toBe('failed');
    });

    it('should have CANCELLED status', () => {
      expect(TaskStatus.CANCELLED).toBe('cancelled');
    });

    it('should have exactly 5 status values', () => {
      const statusValues = Object.values(TaskStatus);
      expect(statusValues).toHaveLength(5);
    });

    it('should have unique values', () => {
      const values = Object.values(TaskStatus);
      const uniqueValues = new Set(values);
      expect(uniqueValues.size).toBe(values.length);
    });
  });

  describe('MessageType enum', () => {
    describe('Content Script -> Background message types', () => {
      it('should have QUEUE_REPLY_FETCH type', () => {
        expect(MessageType.QUEUE_REPLY_FETCH).toBe('QUEUE_REPLY_FETCH');
      });

      it('should have QUEUE_BATCH_REPLY_FETCH type', () => {
        expect(MessageType.QUEUE_BATCH_REPLY_FETCH).toBe('QUEUE_BATCH_REPLY_FETCH');
      });

      it('should have CANCEL_VIDEO_TASKS type', () => {
        expect(MessageType.CANCEL_VIDEO_TASKS).toBe('CANCEL_VIDEO_TASKS');
      });

      it('should have GET_QUEUE_STATUS type', () => {
        expect(MessageType.GET_QUEUE_STATUS).toBe('GET_QUEUE_STATUS');
      });
    });

    describe('Background -> Content Script message types', () => {
      it('should have TASK_COMPLETED type', () => {
        expect(MessageType.TASK_COMPLETED).toBe('TASK_COMPLETED');
      });

      it('should have TASK_FAILED type', () => {
        expect(MessageType.TASK_FAILED).toBe('TASK_FAILED');
      });

      it('should have QUEUE_STATUS_UPDATE type', () => {
        expect(MessageType.QUEUE_STATUS_UPDATE).toBe('QUEUE_STATUS_UPDATE');
      });

      it('should have RATE_LIMITED type', () => {
        expect(MessageType.RATE_LIMITED).toBe('RATE_LIMITED');
      });

      it('should have ALL_TASKS_COMPLETED type', () => {
        expect(MessageType.ALL_TASKS_COMPLETED).toBe('ALL_TASKS_COMPLETED');
      });
    });

    it('should have exactly 9 message types', () => {
      const messageTypes = Object.values(MessageType);
      expect(messageTypes).toHaveLength(9);
    });

    it('should have unique values', () => {
      const values = Object.values(MessageType);
      const uniqueValues = new Set(values);
      expect(uniqueValues.size).toBe(values.length);
    });
  });

  describe('DEFAULT_WORKER_POOL_CONFIG', () => {
    it('should have maxConcurrency set to 3', () => {
      expect(DEFAULT_WORKER_POOL_CONFIG.maxConcurrency).toBe(3);
    });

    it('should have retryLimit set to 3', () => {
      expect(DEFAULT_WORKER_POOL_CONFIG.retryLimit).toBe(3);
    });

    it('should have retryDelayMs set to 1000', () => {
      expect(DEFAULT_WORKER_POOL_CONFIG.retryDelayMs).toBe(1000);
    });

    it('should have rateLimitPauseMs set to 5000', () => {
      expect(DEFAULT_WORKER_POOL_CONFIG.rateLimitPauseMs).toBe(5000);
    });

    it('should have taskTimeoutMs set to 30000', () => {
      expect(DEFAULT_WORKER_POOL_CONFIG.taskTimeoutMs).toBe(30000);
    });

    it('should have all required WorkerPoolConfig properties', () => {
      const config: WorkerPoolConfig = DEFAULT_WORKER_POOL_CONFIG;
      expect(config).toHaveProperty('maxConcurrency');
      expect(config).toHaveProperty('retryLimit');
      expect(config).toHaveProperty('retryDelayMs');
      expect(config).toHaveProperty('rateLimitPauseMs');
      expect(config).toHaveProperty('taskTimeoutMs');
    });

    it('should have positive values for all numeric properties', () => {
      expect(DEFAULT_WORKER_POOL_CONFIG.maxConcurrency).toBeGreaterThan(0);
      expect(DEFAULT_WORKER_POOL_CONFIG.retryLimit).toBeGreaterThan(0);
      expect(DEFAULT_WORKER_POOL_CONFIG.retryDelayMs).toBeGreaterThan(0);
      expect(DEFAULT_WORKER_POOL_CONFIG.rateLimitPauseMs).toBeGreaterThan(0);
      expect(DEFAULT_WORKER_POOL_CONFIG.taskTimeoutMs).toBeGreaterThan(0);
    });

    it('should have reasonable timeout values', () => {
      // Retry delay should be less than rate limit pause
      expect(DEFAULT_WORKER_POOL_CONFIG.retryDelayMs).toBeLessThan(
        DEFAULT_WORKER_POOL_CONFIG.rateLimitPauseMs
      );
      // Task timeout should be greater than rate limit pause
      expect(DEFAULT_WORKER_POOL_CONFIG.taskTimeoutMs).toBeGreaterThan(
        DEFAULT_WORKER_POOL_CONFIG.rateLimitPauseMs
      );
    });
  });

  describe('Type interfaces', () => {
    describe('ReplyFetchTask', () => {
      it('should accept valid task object', () => {
        const task: ReplyFetchTask = {
          id: 'task_123',
          videoId: 'abc123def45',
          parentCommentId: 'comment_456',
          continuationToken: 'token_xyz',
          status: TaskStatus.PENDING,
          retryCount: 0,
          createdAt: Date.now()
        };

        expect(task.id).toBe('task_123');
        expect(task.videoId).toBe('abc123def45');
        expect(task.status).toBe(TaskStatus.PENDING);
      });

      it('should accept optional properties', () => {
        const task: ReplyFetchTask = {
          id: 'task_123',
          videoId: 'abc123def45',
          parentCommentId: 'comment_456',
          continuationToken: 'token_xyz',
          status: TaskStatus.COMPLETED,
          retryCount: 1,
          createdAt: Date.now(),
          startedAt: Date.now() + 100,
          completedAt: Date.now() + 500,
          error: 'Some error',
          tabId: 42
        };

        expect(task.startedAt).toBeDefined();
        expect(task.completedAt).toBeDefined();
        expect(task.error).toBe('Some error');
        expect(task.tabId).toBe(42);
      });
    });

    describe('QueueStats', () => {
      it('should accept valid stats object', () => {
        const stats: QueueStats = {
          totalTasks: 10,
          pendingTasks: 3,
          inProgressTasks: 2,
          completedTasks: 4,
          failedTasks: 1,
          totalRepliesFetched: 100,
          isRateLimited: false,
          currentConcurrency: 2
        };

        expect(stats.totalTasks).toBe(10);
        expect(stats.pendingTasks).toBe(3);
        expect(stats.isRateLimited).toBe(false);
      });

      it('should validate stats counts add up correctly', () => {
        const stats: QueueStats = {
          totalTasks: 10,
          pendingTasks: 3,
          inProgressTasks: 2,
          completedTasks: 4,
          failedTasks: 1,
          totalRepliesFetched: 100,
          isRateLimited: false,
          currentConcurrency: 2
        };

        // In-progress + pending + completed + failed should equal total
        const sum = stats.pendingTasks + stats.inProgressTasks +
                    stats.completedTasks + stats.failedTasks;
        expect(sum).toBe(stats.totalTasks);
      });
    });

    describe('Message interfaces', () => {
      it('should create valid QueueReplyFetchMessage', () => {
        const message: QueueReplyFetchMessage = {
          type: MessageType.QUEUE_REPLY_FETCH,
          task: {
            videoId: 'abc123def45',
            parentCommentId: 'comment_123',
            continuationToken: 'token_xyz'
          }
        };

        expect(message.type).toBe(MessageType.QUEUE_REPLY_FETCH);
        expect(message.task.videoId).toBe('abc123def45');
      });

      it('should create valid QueueBatchReplyFetchMessage', () => {
        const message: QueueBatchReplyFetchMessage = {
          type: MessageType.QUEUE_BATCH_REPLY_FETCH,
          tasks: [
            {
              videoId: 'abc123def45',
              parentCommentId: 'comment_1',
              continuationToken: 'token_1'
            },
            {
              videoId: 'abc123def45',
              parentCommentId: 'comment_2',
              continuationToken: 'token_2'
            }
          ]
        };

        expect(message.type).toBe(MessageType.QUEUE_BATCH_REPLY_FETCH);
        expect(message.tasks).toHaveLength(2);
      });

      it('should create valid CancelVideoTasksMessage', () => {
        const message: CancelVideoTasksMessage = {
          type: MessageType.CANCEL_VIDEO_TASKS,
          videoId: 'abc123def45'
        };

        expect(message.type).toBe(MessageType.CANCEL_VIDEO_TASKS);
        expect(message.videoId).toBe('abc123def45');
      });

      it('should create valid GetQueueStatusMessage', () => {
        const message: GetQueueStatusMessage = {
          type: MessageType.GET_QUEUE_STATUS,
          videoId: 'abc123def45'
        };

        expect(message.type).toBe(MessageType.GET_QUEUE_STATUS);
      });

      it('should create GetQueueStatusMessage without videoId', () => {
        const message: GetQueueStatusMessage = {
          type: MessageType.GET_QUEUE_STATUS
        };

        expect(message.type).toBe(MessageType.GET_QUEUE_STATUS);
        expect(message.videoId).toBeUndefined();
      });

      it('should create valid TaskCompletedMessage', () => {
        const message: TaskCompletedMessage = {
          type: MessageType.TASK_COMPLETED,
          taskId: 'task_123',
          videoId: 'abc123def45',
          parentCommentId: 'comment_456',
          repliesCount: 15
        };

        expect(message.type).toBe(MessageType.TASK_COMPLETED);
        expect(message.repliesCount).toBe(15);
      });

      it('should create valid TaskFailedMessage', () => {
        const message: TaskFailedMessage = {
          type: MessageType.TASK_FAILED,
          taskId: 'task_123',
          videoId: 'abc123def45',
          parentCommentId: 'comment_456',
          error: 'Network error',
          willRetry: true
        };

        expect(message.type).toBe(MessageType.TASK_FAILED);
        expect(message.error).toBe('Network error');
        expect(message.willRetry).toBe(true);
      });

      it('should create valid QueueStatusUpdateMessage', () => {
        const message: QueueStatusUpdateMessage = {
          type: MessageType.QUEUE_STATUS_UPDATE,
          videoId: 'abc123def45',
          pendingCount: 5,
          inProgressCount: 2,
          completedCount: 10,
          failedCount: 1
        };

        expect(message.type).toBe(MessageType.QUEUE_STATUS_UPDATE);
        expect(message.pendingCount).toBe(5);
      });

      it('should create valid RateLimitedMessage', () => {
        const message: RateLimitedMessage = {
          type: MessageType.RATE_LIMITED,
          videoId: 'abc123def45',
          pauseDurationMs: 5000
        };

        expect(message.type).toBe(MessageType.RATE_LIMITED);
        expect(message.pauseDurationMs).toBe(5000);
      });

      it('should create valid AllTasksCompletedMessage', () => {
        const message: AllTasksCompletedMessage = {
          type: MessageType.ALL_TASKS_COMPLETED,
          videoId: 'abc123def45',
          totalReplies: 150,
          failedTasks: 2
        };

        expect(message.type).toBe(MessageType.ALL_TASKS_COMPLETED);
        expect(message.totalReplies).toBe(150);
        expect(message.failedTasks).toBe(2);
      });
    });
  });
});
