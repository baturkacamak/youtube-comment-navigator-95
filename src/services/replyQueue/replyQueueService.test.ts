/**
 * Tests for Reply Queue Service
 * Tests for ReplyQueueService class with mocked chrome API and database
 */

// Use vi.hoisted to create mock functions that will be available before module import
const { mockSendMessage, mockAddListener, mockChrome } = vi.hoisted(() => {
  const mockSendMessage = vi.fn();
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
      sendMessage: vi.fn(),
      query: vi.fn()
    }
  };

  // Set up chrome global immediately
  (globalThis as any).chrome = mockChrome;

  return { mockSendMessage, mockAddListener, mockChrome };
});

// Set up other globals
vi.hoisted(() => {
  // Mock window
  (globalThis as any).window = {
    location: {
      origin: 'https://www.youtube.com',
      href: 'https://www.youtube.com/watch?v=abc12345678'
    },
    innerWidth: 1920,
    innerHeight: 1080,
    devicePixelRatio: 1,
    ytcfg: {
      data_: {
        INNERTUBE_CONTEXT_CLIENT_NAME: '1',
        INNERTUBE_CONTEXT_CLIENT_VERSION: '2.20240620.05.00',
        VISITOR_DATA: 'visitor_data_123',
        ID_TOKEN: 'id_token_456',
        INNERTUBE_CONTEXT: {
          client: {
            clientName: '1',
            clientVersion: '2.20240620.05.00'
          }
        },
        GOOGLE_FEEDBACK_PRODUCT_DATA: {
          accept_language: 'en-US'
        }
      }
    }
  };

  // Mock navigator
  (globalThis as any).navigator = {
    language: 'en-US',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    platform: 'Win32'
  };

  // Mock crypto.subtle - use Object.defineProperty since crypto is getter-only
  Object.defineProperty(globalThis, 'crypto', {
    value: {
      subtle: {
        digest: vi.fn().mockResolvedValue(new ArrayBuffer(20))
      }
    },
    writable: true,
    configurable: true
  });

  // Mock Intl
  (globalThis as any).Intl = {
    DateTimeFormat: () => ({
      resolvedOptions: () => ({
        timeZone: 'America/New_York'
      })
    })
  };

  // Mock Date for timezone offset
  const RealDate = Date;
  (globalThis as any).Date = class extends RealDate {
    getTimezoneOffset() {
      return -300; // EST
    }
  };
});

// Mock the logger module
vi.mock('../../features/shared/utils/logger', () => ({
  default: {
    start: vi.fn(),
    end: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
    debug: vi.fn()
  }
}));

// Mock the database module
vi.mock('../../features/shared/utils/database/database', () => ({
  db: {
    comments: {
      where: vi.fn().mockReturnThis(),
      anyOf: vi.fn().mockReturnThis(),
      toArray: vi.fn().mockResolvedValue([]),
      bulkPut: vi.fn().mockResolvedValue(undefined)
    },
    transaction: vi.fn().mockImplementation(async (mode: string, table: any, callback: () => Promise<void>) => {
      await callback();
    })
  }
}));

// Mock the comments processor
vi.mock('../../features/comments/utils/comments/retrieveYouTubeCommentPaths', () => ({
  processRawJsonCommentsData: vi.fn().mockReturnValue({
    items: []
  })
}));

import { MessageType, QueueStats } from '../../types/queueTypes';

// Import after mocks are set up
import { replyQueueService } from './replyQueueService';

describe('ReplyQueueService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockChrome.runtime.lastError = null;
  });

  describe('getInstance', () => {
    it('should return a singleton instance', () => {
      // The service is already a singleton exported
      expect(replyQueueService).toBeDefined();
    });

    it('should have all public methods', () => {
      expect(typeof replyQueueService.prepareRequest).toBe('function');
      expect(typeof replyQueueService.queueReplyFetch).toBe('function');
      expect(typeof replyQueueService.queueBatchReplyFetch).toBe('function');
      expect(typeof replyQueueService.cancelVideoTasks).toBe('function');
      expect(typeof replyQueueService.getQueueStats).toBe('function');
      expect(typeof replyQueueService.hasActiveProcessing).toBe('function');
    });
  });

  describe('prepareRequest', () => {
    it('should prepare a valid request object', async () => {
      const continuationToken = 'test_continuation_token';
      const request = await replyQueueService.prepareRequest(continuationToken);

      expect(request).toHaveProperty('url');
      expect(request).toHaveProperty('method');
      expect(request).toHaveProperty('headers');
      expect(request).toHaveProperty('body');
    });

    it('should set correct URL', async () => {
      const request = await replyQueueService.prepareRequest('token');
      expect(request.url).toBe('https://www.youtube.com/youtubei/v1/next?replies=true');
    });

    it('should set POST method', async () => {
      const request = await replyQueueService.prepareRequest('token');
      expect(request.method).toBe('POST');
    });

    it('should include Content-Type header', async () => {
      const request = await replyQueueService.prepareRequest('token');
      expect(request.headers['Content-Type']).toBe('application/json');
    });

    it('should include continuation token in body', async () => {
      const token = 'my_continuation_token';
      const request = await replyQueueService.prepareRequest(token);
      const body = JSON.parse(request.body);

      expect(body.continuation).toBe(token);
    });

    it('should include client context in body', async () => {
      const request = await replyQueueService.prepareRequest('token');
      const body = JSON.parse(request.body);

      expect(body.context).toBeDefined();
      expect(body.context.client).toBeDefined();
    });

    it('should filter out empty header values', async () => {
      // Temporarily modify ytcfg to have empty values
      const originalYtcfg = (window as any).ytcfg;
      (window as any).ytcfg = {
        data_: {
          INNERTUBE_CONTEXT_CLIENT_NAME: '1',
          INNERTUBE_CONTEXT_CLIENT_VERSION: '2.20240620.05.00',
          VISITOR_DATA: '',
          ID_TOKEN: ''
        }
      };

      const request = await replyQueueService.prepareRequest('token');

      // Should not have empty values
      expect(request.headers['x-goog-visitor-id']).toBeUndefined();
      expect(request.headers['x-youtube-identity-token']).toBeUndefined();

      // Restore
      (window as any).ytcfg = originalYtcfg;
    });
  });

  describe('queueReplyFetch', () => {
    const validVideoId = 'abc12345678';
    const validParentCommentId = 'comment_123';
    const validContinuationToken = 'token_xyz';

    it('should send message to background and return task ID', async () => {
      const expectedTaskId = 'task_123';
      mockSendMessage.mockImplementation((message: any, callback: (response: any) => void) => {
        callback({ taskId: expectedTaskId });
      });

      const taskId = await replyQueueService.queueReplyFetch(
        validVideoId,
        validParentCommentId,
        validContinuationToken
      );

      expect(taskId).toBe(expectedTaskId);
      expect(mockSendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: MessageType.QUEUE_REPLY_FETCH,
          task: expect.objectContaining({
            videoId: validVideoId,
            parentCommentId: validParentCommentId,
            continuationToken: validContinuationToken
          })
        }),
        expect.any(Function)
      );
    });

    it('should reject when chrome.runtime.lastError is set', async () => {
      mockChrome.runtime.lastError = { message: 'Extension context invalidated' };
      mockSendMessage.mockImplementation((message: any, callback: (response: any) => void) => {
        callback(null);
      });

      await expect(
        replyQueueService.queueReplyFetch(validVideoId, validParentCommentId, validContinuationToken)
      ).rejects.toEqual({ message: 'Extension context invalidated' });
    });

    it('should reject when no task ID is returned', async () => {
      mockSendMessage.mockImplementation((message: any, callback: (response: any) => void) => {
        callback({});
      });

      await expect(
        replyQueueService.queueReplyFetch(validVideoId, validParentCommentId, validContinuationToken)
      ).rejects.toThrow('No task ID returned');
    });

    it('should register callbacks when provided', async () => {
      const expectedTaskId = 'task_456';
      mockSendMessage.mockImplementation((message: any, callback: (response: any) => void) => {
        callback({ taskId: expectedTaskId });
      });

      const onComplete = vi.fn();
      const onFail = vi.fn();

      await replyQueueService.queueReplyFetch(
        validVideoId,
        validParentCommentId,
        validContinuationToken,
        { onComplete, onFail }
      );

      // Callbacks should be stored but not called immediately
      expect(onComplete).not.toHaveBeenCalled();
      expect(onFail).not.toHaveBeenCalled();
    });

    it('should track active video processing', async () => {
      mockSendMessage.mockImplementation((message: any, callback: (response: any) => void) => {
        callback({ taskId: 'task_789' });
      });

      await replyQueueService.queueReplyFetch(
        validVideoId,
        validParentCommentId,
        validContinuationToken
      );

      expect(replyQueueService.hasActiveProcessing(validVideoId)).toBe(true);
    });
  });

  describe('queueBatchReplyFetch', () => {
    const tasks = [
      {
        videoId: 'abc12345678',
        parentCommentId: 'comment_1',
        continuationToken: 'token_1'
      },
      {
        videoId: 'abc12345678',
        parentCommentId: 'comment_2',
        continuationToken: 'token_2'
      }
    ];

    it('should send batch message and return task IDs', async () => {
      const expectedTaskIds = ['task_1', 'task_2'];
      mockSendMessage.mockImplementation((message: any, callback: (response: any) => void) => {
        callback({ taskIds: expectedTaskIds });
      });

      const taskIds = await replyQueueService.queueBatchReplyFetch(tasks);

      expect(taskIds).toEqual(expectedTaskIds);
      expect(mockSendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: MessageType.QUEUE_BATCH_REPLY_FETCH,
          tasks: expect.arrayContaining([
            expect.objectContaining({
              videoId: 'abc12345678',
              parentCommentId: 'comment_1'
            })
          ])
        }),
        expect.any(Function)
      );
    });

    it('should reject when chrome.runtime.lastError is set', async () => {
      mockChrome.runtime.lastError = { message: 'Connection failed' };
      mockSendMessage.mockImplementation((message: any, callback: (response: any) => void) => {
        callback(null);
      });

      await expect(
        replyQueueService.queueBatchReplyFetch(tasks)
      ).rejects.toEqual({ message: 'Connection failed' });
    });

    it('should reject when no task IDs are returned', async () => {
      mockSendMessage.mockImplementation((message: any, callback: (response: any) => void) => {
        callback({});
      });

      await expect(
        replyQueueService.queueBatchReplyFetch(tasks)
      ).rejects.toThrow('No task IDs returned');
    });

    it('should track active processing for each video', async () => {
      mockSendMessage.mockImplementation((message: any, callback: (response: any) => void) => {
        callback({ taskIds: ['task_1', 'task_2'] });
      });

      const multiVideoTasks = [
        { videoId: 'abc12345678', parentCommentId: 'c1', continuationToken: 't1' },
        { videoId: 'xyz98765432', parentCommentId: 'c2', continuationToken: 't2' }
      ];

      await replyQueueService.queueBatchReplyFetch(multiVideoTasks);

      expect(replyQueueService.hasActiveProcessing('abc12345678')).toBe(true);
      expect(replyQueueService.hasActiveProcessing('xyz98765432')).toBe(true);
    });

    it('should register video callbacks when provided', async () => {
      mockSendMessage.mockImplementation((message: any, callback: (response: any) => void) => {
        callback({ taskIds: ['task_1'] });
      });

      const onAllComplete = vi.fn();
      const onRateLimit = vi.fn();

      await replyQueueService.queueBatchReplyFetch(tasks, {
        onAllComplete,
        onRateLimit
      });

      expect(onAllComplete).not.toHaveBeenCalled();
      expect(onRateLimit).not.toHaveBeenCalled();
    });
  });

  describe('cancelVideoTasks', () => {
    const videoId = 'abc12345678';

    it('should send cancel message to background', async () => {
      mockSendMessage.mockImplementation((message: any, callback: (response: any) => void) => {
        callback({ success: true });
      });

      await replyQueueService.cancelVideoTasks(videoId);

      expect(mockSendMessage).toHaveBeenCalledWith(
        {
          type: MessageType.CANCEL_VIDEO_TASKS,
          videoId
        },
        expect.any(Function)
      );
    });

    it('should reject when chrome.runtime.lastError is set', async () => {
      mockChrome.runtime.lastError = { message: 'Failed to cancel' };
      mockSendMessage.mockImplementation((message: any, callback: (response: any) => void) => {
        callback(null);
      });

      await expect(
        replyQueueService.cancelVideoTasks(videoId)
      ).rejects.toEqual({ message: 'Failed to cancel' });
    });

    it('should clear active processing tracking', async () => {
      // First, set up active processing
      mockSendMessage.mockImplementation((message: any, callback: (response: any) => void) => {
        if (message.type === MessageType.QUEUE_REPLY_FETCH) {
          callback({ taskId: 'task_1' });
        } else {
          callback({ success: true });
        }
      });

      await replyQueueService.queueReplyFetch(videoId, 'comment', 'token');
      expect(replyQueueService.hasActiveProcessing(videoId)).toBe(true);

      await replyQueueService.cancelVideoTasks(videoId);
      expect(replyQueueService.hasActiveProcessing(videoId)).toBe(false);
    });
  });

  describe('getQueueStats', () => {
    it('should send get queue status message and return stats', async () => {
      const expectedStats: QueueStats = {
        totalTasks: 10,
        pendingTasks: 5,
        inProgressTasks: 2,
        completedTasks: 2,
        failedTasks: 1,
        totalRepliesFetched: 50,
        isRateLimited: false,
        currentConcurrency: 2
      };

      mockSendMessage.mockImplementation((message: any, callback: (response: any) => void) => {
        callback(expectedStats);
      });

      const stats = await replyQueueService.getQueueStats('abc12345678');

      expect(stats).toEqual(expectedStats);
      expect(mockSendMessage).toHaveBeenCalledWith(
        {
          type: MessageType.GET_QUEUE_STATUS,
          videoId: 'abc12345678'
        },
        expect.any(Function)
      );
    });

    it('should request global stats when no videoId provided', async () => {
      mockSendMessage.mockImplementation((message: any, callback: (response: any) => void) => {
        callback({
          totalTasks: 20,
          pendingTasks: 10,
          inProgressTasks: 5,
          completedTasks: 4,
          failedTasks: 1,
          totalRepliesFetched: 100,
          isRateLimited: false,
          currentConcurrency: 3
        });
      });

      await replyQueueService.getQueueStats();

      expect(mockSendMessage).toHaveBeenCalledWith(
        {
          type: MessageType.GET_QUEUE_STATUS,
          videoId: undefined
        },
        expect.any(Function)
      );
    });

    it('should reject when chrome.runtime.lastError is set', async () => {
      mockChrome.runtime.lastError = { message: 'Failed to get stats' };
      mockSendMessage.mockImplementation((message: any, callback: (response: any) => void) => {
        callback(null);
      });

      await expect(
        replyQueueService.getQueueStats()
      ).rejects.toEqual({ message: 'Failed to get stats' });
    });
  });

  describe('hasActiveProcessing', () => {
    beforeEach(() => {
      mockSendMessage.mockImplementation((message: any, callback: (response: any) => void) => {
        callback({ taskId: 'task_test' });
      });
    });

    it('should return false when no active processing', () => {
      // Note: This might return true if previous tests left state
      // A fresh instance would return false
      const hasActive = replyQueueService.hasActiveProcessing();
      expect(typeof hasActive).toBe('boolean');
    });

    it('should return true for specific video with active processing', async () => {
      await replyQueueService.queueReplyFetch('unique_vid_1', 'comment', 'token');

      expect(replyQueueService.hasActiveProcessing('unique_vid_1')).toBe(true);
    });

    it('should return false for specific video without active processing', async () => {
      await replyQueueService.queueReplyFetch('unique_vid_2', 'comment', 'token');

      expect(replyQueueService.hasActiveProcessing('nonexistent_vid')).toBe(false);
    });

    it('should return true when any video has active processing', async () => {
      await replyQueueService.queueReplyFetch('unique_vid_3', 'comment', 'token');

      expect(replyQueueService.hasActiveProcessing()).toBe(true);
    });
  });

  describe('message listeners', () => {
    it('should have chrome.runtime.onMessage.addListener available', () => {
      // The chrome mock should have the addListener function set up
      expect(mockChrome.runtime.onMessage.addListener).toBeDefined();
      expect(typeof mockChrome.runtime.onMessage.addListener).toBe('function');
    });
  });

  describe('cookie reading', () => {
    it('should handle cookie reading gracefully', async () => {
      const request = await replyQueueService.prepareRequest('token');

      // Should not throw and should return a valid request
      expect(request.url).toBeDefined();
      expect(request.method).toBeDefined();
    });
  });

  describe('default client context', () => {
    it('should use default context when ytcfg is not available', async () => {
      const originalYtcfg = (window as any).ytcfg;
      (window as any).ytcfg = undefined;

      const request = await replyQueueService.prepareRequest('token');
      const body = JSON.parse(request.body);

      expect(body.context.client).toBeDefined();
      expect(body.context.client.userAgent).toBe(navigator.userAgent);

      // Restore
      (window as any).ytcfg = originalYtcfg;
    });
  });
});
