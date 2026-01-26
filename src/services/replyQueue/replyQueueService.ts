/**
 * Reply Queue Service - Content Script Side
 * Queues reply fetch tasks to be processed by the background worker
 */

import {
  MessageType,
  QueueMessage,
  QueueStats,
  AllTasksCompletedMessage,
  TaskCompletedMessage,
  TaskFailedMessage,
  RateLimitedMessage,
  QueueStatusUpdateMessage
} from '../../types/queueTypes';
import { PreparedRequest } from './backgroundWorker';
import { processRawJsonCommentsData } from '../../features/comments/utils/comments/retrieveYouTubeCommentPaths';
import { db } from '../../features/shared/utils/database/database';
import { dbEvents } from '../../features/shared/utils/database/dbEvents';
import logger from '../../features/shared/utils/logger';

// Event callbacks
type TaskCompletedCallback = (taskId: string, videoId: string, repliesCount: number) => void;
type TaskFailedCallback = (taskId: string, videoId: string, error: string) => void;
type AllCompletedCallback = (videoId: string, totalReplies: number, failedTasks: number) => void;
type RateLimitCallback = (videoId: string, pauseDurationMs: number) => void;

class ReplyQueueService {
  private static instance: ReplyQueueService;
  private isInitialized = false;
  private pendingCallbacks: Map<string, {
    onComplete?: TaskCompletedCallback;
    onFail?: TaskFailedCallback;
  }> = new Map();
  private videoCallbacks: Map<string, {
    onAllComplete?: AllCompletedCallback;
    onRateLimit?: RateLimitCallback;
  }> = new Map();

  // Track active reply processing per video
  private activeVideoProcessing: Map<string, { taskCount: number; totalReplies: number }> = new Map();

  private constructor() {
    this.setupMessageListeners();
  }

  public static getInstance(): ReplyQueueService {
    if (!ReplyQueueService.instance) {
      ReplyQueueService.instance = new ReplyQueueService();
    }
    return ReplyQueueService.instance;
  }

  private setupMessageListeners(): void {
    if (this.isInitialized) return;

    // Listen for messages from background worker
    chrome.runtime.onMessage.addListener((message: QueueMessage, sender, sendResponse) => {
      this.handleBackgroundMessage(message);
      return false;
    });

    // Handle raw reply data processing requests from background worker
    chrome.runtime.onMessage.addListener((message: any, sender, sendResponse) => {
      if (message.type === 'PROCESS_REPLY_DATA') {
        this.processAndStoreReplyData(message.videoId, message.parentCommentId, message.rawData)
          .then((count) => sendResponse({ success: true, count }))
          .catch((err) => {
            logger.error('[ReplyQueueService] Failed to process reply data:', err);
            sendResponse({ success: false, error: String(err) });
          });
        return true; // Keep channel open for async response
      }
      return false;
    });

    this.isInitialized = true;
    logger.info('[ReplyQueueService] Message listeners initialized');
  }

  private handleBackgroundMessage(message: QueueMessage): void {
    switch (message.type) {
      case MessageType.TASK_COMPLETED: {
        const msg = message as TaskCompletedMessage;
        logger.debug(`[ReplyQueueService] Task ${msg.taskId} completed with ${msg.repliesCount} replies`);

        const callbacks = this.pendingCallbacks.get(msg.taskId);
        if (callbacks?.onComplete) {
          callbacks.onComplete(msg.taskId, msg.videoId, msg.repliesCount);
        }
        this.pendingCallbacks.delete(msg.taskId);

        // Update video processing stats
        const videoStats = this.activeVideoProcessing.get(msg.videoId);
        if (videoStats) {
          videoStats.totalReplies += msg.repliesCount;
        }
        break;
      }

      case MessageType.TASK_FAILED: {
        const msg = message as TaskFailedMessage;
        logger.warn(`[ReplyQueueService] Task ${msg.taskId} failed: ${msg.error}`);

        const callbacks = this.pendingCallbacks.get(msg.taskId);
        if (callbacks?.onFail) {
          callbacks.onFail(msg.taskId, msg.videoId, msg.error);
        }
        if (!msg.willRetry) {
          this.pendingCallbacks.delete(msg.taskId);
        }
        break;
      }

      case MessageType.ALL_TASKS_COMPLETED: {
        const msg = message as AllTasksCompletedMessage;
        logger.success(`[ReplyQueueService] All tasks completed for ${msg.videoId}. Total: ${msg.totalReplies}, Failed: ${msg.failedTasks}`);

        const videoCallbacks = this.videoCallbacks.get(msg.videoId);
        if (videoCallbacks?.onAllComplete) {
          videoCallbacks.onAllComplete(msg.videoId, msg.totalReplies, msg.failedTasks);
        }

        // Clean up
        this.activeVideoProcessing.delete(msg.videoId);
        this.videoCallbacks.delete(msg.videoId);
        break;
      }

      case MessageType.RATE_LIMITED: {
        const msg = message as RateLimitedMessage;
        logger.warn(`[ReplyQueueService] Rate limited for ${msg.videoId}. Pausing ${msg.pauseDurationMs}ms`);

        const videoCallbacks = this.videoCallbacks.get(msg.videoId);
        if (videoCallbacks?.onRateLimit) {
          videoCallbacks.onRateLimit(msg.videoId, msg.pauseDurationMs);
        }
        break;
      }
    }
  }

  /**
   * Prepare a fetch request with all necessary authentication context
   */
  public async prepareRequest(continuationToken: string): Promise<PreparedRequest> {
    const windowObj = window as any;
    const ytcfg = windowObj.ytcfg?.data_ || windowObj.ytcfg;

    // Build authorization header
    const authHeader = await this.buildAuthorizationHeader();

    // Get client context
    const clientName = ytcfg?.INNERTUBE_CONTEXT_CLIENT_NAME || '1';
    const clientVersion = ytcfg?.INNERTUBE_CONTEXT_CLIENT_VERSION || '2.20240620.05.00';
    const feedbackData = ytcfg?.GOOGLE_FEEDBACK_PRODUCT_DATA;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': '*/*',
      'Accept-Language': feedbackData?.accept_language || navigator.language,
      'x-goog-visitor-id': ytcfg?.VISITOR_DATA || '',
      'x-youtube-identity-token': ytcfg?.ID_TOKEN || '',
      'x-youtube-client-name': clientName,
      'x-youtube-client-version': clientVersion,
      'Origin': window.location.origin,
      'Cache-Control': 'no-store',
      'Pragma': 'no-cache'
    };

    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    // Filter out empty values
    const filteredHeaders: Record<string, string> = {};
    for (const [key, value] of Object.entries(headers)) {
      if (value) {
        filteredHeaders[key] = value;
      }
    }

    // Build request body
    const clientContext = ytcfg?.INNERTUBE_CONTEXT?.client || this.getDefaultClientContext();
    const body = {
      context: {
        client: clientContext
      },
      continuation: continuationToken
    };

    return {
      url: 'https://www.youtube.com/youtubei/v1/next?replies=true',
      method: 'POST',
      headers: filteredHeaders,
      body: JSON.stringify(body)
    };
  }

  private getDefaultClientContext(): any {
    return {
      deviceMake: '',
      deviceModel: '',
      userAgent: navigator.userAgent,
      clientName: '1',
      clientVersion: '2.20240620.05.00',
      osName: navigator.platform,
      osVersion: '',
      originalUrl: window.location.href,
      platform: 'DESKTOP',
      clientFormFactor: 'UNKNOWN_FORM_FACTOR',
      screenDensityFloat: window.devicePixelRatio,
      userInterfaceTheme: 'USER_INTERFACE_THEME_DARK',
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      browserVersion: '2.20240620.05.00',
      screenWidthPoints: window.innerWidth,
      screenHeightPoints: window.innerHeight,
      utcOffsetMinutes: new Date().getTimezoneOffset() * -1,
      clientScreen: 'WATCH'
    };
  }

  private async buildAuthorizationHeader(): Promise<string | undefined> {
    const origin = window.location.origin || 'https://www.youtube.com';
    const timestamp = Math.floor(Date.now() / 1000);
    const tokens: string[] = [];

    const sapSid = this.readCookie(['__SAPISID', 'SAPISID', '__Secure-3PAPISID']);
    if (sapSid) {
      const token = await this.buildSapSidToken('SAPISIDHASH', sapSid, origin, timestamp);
      if (token) tokens.push(token);
    }

    const onePSid = this.readCookie(['__1PSAPISID', '__Secure-1PAPISID']);
    if (onePSid) {
      const token = await this.buildSapSidToken('SAPISID1PHASH', onePSid, origin, timestamp);
      if (token) tokens.push(token);
    }

    const threePSid = this.readCookie(['__3PSAPISID', '__Secure-3PAPISID']);
    if (threePSid) {
      const token = await this.buildSapSidToken('SAPISID3PHASH', threePSid, origin, timestamp);
      if (token) tokens.push(token);
    }

    return tokens.length ? tokens.join(' ') : undefined;
  }

  private readCookie(names: string[]): string | undefined {
    try {
      const cookies = document.cookie.split(';');
      for (const name of names) {
        for (const cookie of cookies) {
          const trimmed = cookie.trim();
          if (trimmed.startsWith(`${name}=`)) {
            return trimmed.substring(name.length + 1);
          }
        }
      }
      return undefined;
    } catch {
      return undefined;
    }
  }

  private async buildSapSidToken(
    headerName: string,
    secret: string,
    origin: string,
    timestamp: number
  ): Promise<string | undefined> {
    if (!secret) return undefined;

    try {
      const data = new TextEncoder().encode(`${timestamp} ${secret} ${origin}`);
      const buffer = await crypto.subtle.digest('SHA-1', data);
      const digest = Array.from(new Uint8Array(buffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      return `${headerName} ${timestamp}_${digest}`;
    } catch {
      return undefined;
    }
  }

  /**
   * Queue a single reply fetch task
   */
  public async queueReplyFetch(
    videoId: string,
    parentCommentId: string,
    continuationToken: string,
    callbacks?: {
      onComplete?: TaskCompletedCallback;
      onFail?: TaskFailedCallback;
    }
  ): Promise<string> {
    const preparedRequest = await this.prepareRequest(continuationToken);

    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        {
          type: MessageType.QUEUE_REPLY_FETCH,
          task: {
            videoId,
            parentCommentId,
            continuationToken,
            preparedRequest
          }
        },
        (response) => {
          if (chrome.runtime.lastError) {
            logger.error('[ReplyQueueService] Failed to queue task:', chrome.runtime.lastError);
            reject(chrome.runtime.lastError);
            return;
          }

          if (response?.taskId) {
            if (callbacks) {
              this.pendingCallbacks.set(response.taskId, callbacks);
            }

            // Track active processing
            const stats = this.activeVideoProcessing.get(videoId) || { taskCount: 0, totalReplies: 0 };
            stats.taskCount++;
            this.activeVideoProcessing.set(videoId, stats);

            resolve(response.taskId);
          } else {
            reject(new Error('No task ID returned'));
          }
        }
      );
    });
  }

  /**
   * Queue multiple reply fetch tasks at once
   */
  public async queueBatchReplyFetch(
    tasks: Array<{
      videoId: string;
      parentCommentId: string;
      continuationToken: string;
    }>,
    videoCallbacks?: {
      onAllComplete?: AllCompletedCallback;
      onRateLimit?: RateLimitCallback;
    }
  ): Promise<string[]> {
    // Prepare all requests
    const preparedTasks = await Promise.all(
      tasks.map(async (task) => ({
        ...task,
        preparedRequest: await this.prepareRequest(task.continuationToken)
      }))
    );

    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        {
          type: MessageType.QUEUE_BATCH_REPLY_FETCH,
          tasks: preparedTasks
        },
        (response) => {
          if (chrome.runtime.lastError) {
            logger.error('[ReplyQueueService] Failed to queue batch tasks:', chrome.runtime.lastError);
            reject(chrome.runtime.lastError);
            return;
          }

          if (response?.taskIds) {
            // Track active processing per video
            const videoIds = new Set(tasks.map(t => t.videoId));
            for (const videoId of videoIds) {
              const count = tasks.filter(t => t.videoId === videoId).length;
              const stats = this.activeVideoProcessing.get(videoId) || { taskCount: 0, totalReplies: 0 };
              stats.taskCount += count;
              this.activeVideoProcessing.set(videoId, stats);

              if (videoCallbacks) {
                this.videoCallbacks.set(videoId, videoCallbacks);
              }
            }

            resolve(response.taskIds);
          } else {
            reject(new Error('No task IDs returned'));
          }
        }
      );
    });
  }

  /**
   * Cancel all pending tasks for a video
   */
  public cancelVideoTasks(videoId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        {
          type: MessageType.CANCEL_VIDEO_TASKS,
          videoId
        },
        (response) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
            return;
          }
          this.activeVideoProcessing.delete(videoId);
          this.videoCallbacks.delete(videoId);
          resolve();
        }
      );
    });
  }

  /**
   * Get current queue statistics
   */
  public getQueueStats(videoId?: string): Promise<QueueStats> {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        {
          type: MessageType.GET_QUEUE_STATUS,
          videoId
        },
        (response) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
            return;
          }
          resolve(response as QueueStats);
        }
      );
    });
  }

  /**
   * Check if there's active reply processing for a video
   */
  public hasActiveProcessing(videoId?: string): boolean {
    if (videoId) {
      return this.activeVideoProcessing.has(videoId);
    }
    return this.activeVideoProcessing.size > 0;
  }

  /**
   * Process raw reply data from background worker and store in IndexedDB
   * @param videoId - Video ID
   * @param parentCommentId - Parent comment ID for the replies
   * @param rawData - Raw API response from YouTube
   * @returns Number of replies stored
   */
  private async processAndStoreReplyData(
    videoId: string,
    parentCommentId: string,
    rawData: any
  ): Promise<number> {
    try {
      logger.start('processAndStoreReplyData');

      // Process raw reply data using the standard transformation
      // Pass as array since processRawJsonCommentsData expects an array of raw responses
      const processedData = processRawJsonCommentsData([rawData], videoId);

      if (processedData.items.length === 0) {
        logger.info(`[ReplyQueueService] No reply items found for parent ${parentCommentId}`);
        logger.end('processAndStoreReplyData');
        return 0;
      }

      // Ensure all items have the correct parent reference and reply level
      const repliesWithParent = processedData.items.map((item: any) => ({
        ...item,
        commentParentId: item.commentParentId || parentCommentId,
        replyLevel: item.replyLevel ?? 1
      }));

      // Upsert replies into database
      await db.transaction('rw', db.comments, async () => {
        const incomingIds = repliesWithParent.map((c: any) => c.commentId).filter(Boolean);
        if (incomingIds.length === 0) return;

        const existingRecords = await db.comments
          .where('commentId')
          .anyOf(incomingIds)
          .toArray();

        const idMap = new Map(existingRecords.map(c => [c.commentId, c.id]));

        const commentsToSave = repliesWithParent.map((c: any) => {
          if (idMap.has(c.commentId)) {
            return { ...c, id: idMap.get(c.commentId) };
          }
          const { id, ...rest } = c;
          return rest;
        });

        await db.comments.bulkPut(commentsToSave);
      });

      logger.success(`[ReplyQueueService] Stored ${repliesWithParent.length} replies for parent ${parentCommentId}`);

      // Emit database event for reactive UI updates
      if (repliesWithParent.length > 0) {
        const replyIds = repliesWithParent.map((c: any) => c.commentId).filter(Boolean);
        dbEvents.emitRepliesAdded(videoId, repliesWithParent.length, replyIds);

        // Get updated total count and emit
        const totalCount = await db.comments.where('videoId').equals(videoId).count();
        dbEvents.emitCountUpdated(videoId, totalCount);
      }

      logger.end('processAndStoreReplyData');

      return repliesWithParent.length;
    } catch (error) {
      logger.error('[ReplyQueueService] Failed to process and store reply data:', error);
      logger.end('processAndStoreReplyData');
      throw error;
    }
  }
}

// Export singleton instance
export const replyQueueService = ReplyQueueService.getInstance();
