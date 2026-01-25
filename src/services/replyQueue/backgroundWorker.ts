/**
 * Background Worker for Reply Fetch Queue
 * Handles concurrent fetching of comment replies with rate limiting and backoff
 */

import {
  ReplyFetchTask,
  TaskStatus,
  MessageType,
  QueueMessage,
  WorkerPoolConfig,
  DEFAULT_WORKER_POOL_CONFIG,
  QueueStats
} from '../../types/queueTypes';

// Request context prepared by content script
export interface PreparedRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string;
}

// Extended task with prepared request
export interface ReplyFetchTaskWithRequest extends ReplyFetchTask {
  preparedRequest: PreparedRequest;
}

// In-memory queue storage
const taskQueues = new Map<string, ReplyFetchTaskWithRequest[]>(); // videoId -> tasks
const activeWorkers = new Map<string, Set<string>>(); // videoId -> active task ids
const completedCounts = new Map<string, { replies: number; completed: number; failed: number }>();

let config: WorkerPoolConfig = { ...DEFAULT_WORKER_POOL_CONFIG };
let isRateLimited = false;
let rateLimitEndTime = 0;

// Generate unique task ID
function generateTaskId(): string {
  return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Get or create queue for video
function getQueue(videoId: string): ReplyFetchTaskWithRequest[] {
  if (!taskQueues.has(videoId)) {
    taskQueues.set(videoId, []);
  }
  return taskQueues.get(videoId)!;
}

// Get or create active workers set for video
function getActiveWorkers(videoId: string): Set<string> {
  if (!activeWorkers.has(videoId)) {
    activeWorkers.set(videoId, new Set());
  }
  return activeWorkers.get(videoId)!;
}

// Get or create completed counts for video
function getCompletedCounts(videoId: string) {
  if (!completedCounts.has(videoId)) {
    completedCounts.set(videoId, { replies: 0, completed: 0, failed: 0 });
  }
  return completedCounts.get(videoId)!;
}

// Add task to queue
export function addTask(
  videoId: string,
  parentCommentId: string,
  continuationToken: string,
  preparedRequest: PreparedRequest,
  tabId?: number
): string {
  const queue = getQueue(videoId);
  const taskId = generateTaskId();

  const task: ReplyFetchTaskWithRequest = {
    id: taskId,
    videoId,
    parentCommentId,
    continuationToken,
    preparedRequest,
    status: TaskStatus.PENDING,
    retryCount: 0,
    createdAt: Date.now(),
    tabId
  };

  queue.push(task);
  console.log(`[BackgroundWorker] Added task ${taskId} for comment ${parentCommentId} (tab: ${tabId})`);

  // Trigger processing
  processQueue(videoId);

  return taskId;
}

// Add multiple tasks at once
export function addBatchTasks(
  tasks: Array<{
    videoId: string;
    parentCommentId: string;
    continuationToken: string;
    preparedRequest: PreparedRequest;
  }>,
  tabId?: number
): string[] {
  const taskIds: string[] = [];
  const videoIds = new Set<string>();

  for (const taskData of tasks) {
    const queue = getQueue(taskData.videoId);
    const taskId = generateTaskId();

    const task: ReplyFetchTaskWithRequest = {
      id: taskId,
      videoId: taskData.videoId,
      parentCommentId: taskData.parentCommentId,
      continuationToken: taskData.continuationToken,
      preparedRequest: taskData.preparedRequest,
      status: TaskStatus.PENDING,
      retryCount: 0,
      createdAt: Date.now(),
      tabId
    };

    queue.push(task);
    taskIds.push(taskId);
    videoIds.add(taskData.videoId);
  }

  console.log(`[BackgroundWorker] Added ${taskIds.length} batch tasks (tab: ${tabId})`);

  // Trigger processing for all affected videos
  for (const videoId of videoIds) {
    processQueue(videoId);
  }

  return taskIds;
}

// Cancel all tasks for a video
export function cancelVideoTasks(videoId: string): void {
  const queue = getQueue(videoId);

  // Mark all pending tasks as cancelled
  for (const task of queue) {
    if (task.status === TaskStatus.PENDING) {
      task.status = TaskStatus.CANCELLED;
    }
  }

  // Clear the queue
  taskQueues.delete(videoId);
  activeWorkers.delete(videoId);
  completedCounts.delete(videoId);

  console.log(`[BackgroundWorker] Cancelled all tasks for video ${videoId}`);
}

// Get queue statistics
export function getQueueStats(videoId?: string): QueueStats {
  if (videoId) {
    const queue = getQueue(videoId);
    const workers = getActiveWorkers(videoId);
    const counts = getCompletedCounts(videoId);

    return {
      totalTasks: queue.length,
      pendingTasks: queue.filter(t => t.status === TaskStatus.PENDING).length,
      inProgressTasks: workers.size,
      completedTasks: counts.completed,
      failedTasks: counts.failed,
      totalRepliesFetched: counts.replies,
      isRateLimited,
      currentConcurrency: workers.size
    };
  }

  // Aggregate stats across all videos
  let totalTasks = 0;
  let pendingTasks = 0;
  let inProgressTasks = 0;
  let completedTasks = 0;
  let failedTasks = 0;
  let totalReplies = 0;

  for (const [vid, queue] of taskQueues) {
    totalTasks += queue.length;
    pendingTasks += queue.filter(t => t.status === TaskStatus.PENDING).length;
    inProgressTasks += getActiveWorkers(vid).size;
    const counts = getCompletedCounts(vid);
    completedTasks += counts.completed;
    failedTasks += counts.failed;
    totalReplies += counts.replies;
  }

  return {
    totalTasks,
    pendingTasks,
    inProgressTasks,
    completedTasks,
    failedTasks,
    totalRepliesFetched: totalReplies,
    isRateLimited,
    currentConcurrency: inProgressTasks
  };
}

// Process queue for a specific video
async function processQueue(videoId: string): Promise<void> {
  const queue = getQueue(videoId);
  const workers = getActiveWorkers(videoId);

  // Check rate limiting
  if (isRateLimited && Date.now() < rateLimitEndTime) {
    console.log(`[BackgroundWorker] Rate limited, waiting until ${new Date(rateLimitEndTime).toISOString()}`);
    setTimeout(() => processQueue(videoId), rateLimitEndTime - Date.now());
    return;
  }

  if (isRateLimited && Date.now() >= rateLimitEndTime) {
    isRateLimited = false;
    console.log('[BackgroundWorker] Rate limit period ended');
  }

  // Find pending tasks and start workers up to max concurrency
  while (workers.size < config.maxConcurrency) {
    const pendingTask = queue.find(t => t.status === TaskStatus.PENDING);
    if (!pendingTask) break;

    pendingTask.status = TaskStatus.IN_PROGRESS;
    pendingTask.startedAt = Date.now();
    workers.add(pendingTask.id);

    // Execute task asynchronously
    executeTask(pendingTask).then(result => {
      workers.delete(pendingTask.id);

      if (result.success) {
        pendingTask.status = TaskStatus.COMPLETED;
        pendingTask.completedAt = Date.now();
        const counts = getCompletedCounts(videoId);
        counts.completed++;
        counts.replies += result.repliesCount || 0;

        // Notify content script of completion
        notifyTaskCompleted(pendingTask, result.repliesCount || 0);

        // If there are more continuation tokens (pagination), add them as new tasks
        if (result.nextContinuationToken && result.nextPreparedRequest) {
          addTask(videoId, pendingTask.parentCommentId, result.nextContinuationToken, result.nextPreparedRequest);
        }
      } else {
        if (pendingTask.retryCount < config.retryLimit && !result.rateLimited) {
          // Retry the task
          pendingTask.status = TaskStatus.PENDING;
          pendingTask.retryCount++;
          pendingTask.error = result.error;
          console.log(`[BackgroundWorker] Retrying task ${pendingTask.id} (attempt ${pendingTask.retryCount})`);

          // Add delay before retry
          setTimeout(() => processQueue(videoId), config.retryDelayMs * pendingTask.retryCount);
          return;
        } else {
          pendingTask.status = TaskStatus.FAILED;
          pendingTask.completedAt = Date.now();
          pendingTask.error = result.error;
          const counts = getCompletedCounts(videoId);
          counts.failed++;

          notifyTaskFailed(pendingTask, result.error || 'Unknown error', false);
        }
      }

      // Check if all tasks are done
      checkAllTasksCompleted(videoId);

      // Continue processing queue
      processQueue(videoId);
    });
  }
}

// Execute a single fetch task
async function executeTask(task: ReplyFetchTaskWithRequest): Promise<{
  success: boolean;
  repliesCount?: number;
  nextContinuationToken?: string;
  nextPreparedRequest?: PreparedRequest;
  error?: string;
  rateLimited?: boolean;
}> {
  try {
    const response = await fetch(task.preparedRequest.url, {
      method: task.preparedRequest.method,
      headers: task.preparedRequest.headers,
      body: task.preparedRequest.body,
      credentials: 'include'
    });

    if (response.status === 429) {
      // Rate limited
      isRateLimited = true;
      rateLimitEndTime = Date.now() + config.rateLimitPauseMs;
      console.warn(`[BackgroundWorker] Rate limited! Pausing for ${config.rateLimitPauseMs}ms`);

      // Notify content script
      notifyRateLimited(task.videoId, config.rateLimitPauseMs);

      // Reduce concurrency temporarily
      config.maxConcurrency = Math.max(1, config.maxConcurrency - 1);

      return { success: false, error: 'Rate limited', rateLimited: true };
    }

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}: ${response.statusText}` };
    }

    const data = await response.json();

    // Parse reply data - just count and next token
    const result = parseReplyResponse(data, task);

    // Send raw reply data to content script for processing
    // This keeps transformation logic in one place (content script)
    if (result.hasReplies) {
      await sendReplyDataToContentScript(data, task.videoId, task.parentCommentId, task.tabId);
    }

    return {
      success: true,
      repliesCount: result.repliesCount,
      nextContinuationToken: result.nextToken,
      nextPreparedRequest: result.nextToken ? buildNextRequest(task.preparedRequest, result.nextToken) : undefined
    };
  } catch (error) {
    console.error(`[BackgroundWorker] Task ${task.id} failed:`, error);
    return { success: false, error: String(error) };
  }
}

// Parse the YouTube API response for replies
function parseReplyResponse(data: any, task: ReplyFetchTaskWithRequest): {
  hasReplies: boolean;
  repliesCount: number;
  nextToken?: string;
} {
  let nextToken: string | undefined;
  let repliesCount = 0;

  // Extract continuation items
  const continuationItems =
    data.onResponseReceivedEndpoints?.[0]?.appendContinuationItemsAction?.continuationItems ||
    data.onResponseReceivedEndpoints?.[1]?.reloadContinuationItemsCommand?.continuationItems ||
    [];

  // Count mutations (comment data in new format)
  const mutations = data.frameworkUpdates?.entityBatchUpdate?.mutations || [];
  for (const mutation of mutations) {
    if (mutation.payload?.commentEntityPayload) {
      repliesCount++;
    }
  }

  // Find next continuation token for more replies
  for (const item of continuationItems) {
    const token = item.continuationItemRenderer?.continuationEndpoint?.continuationCommand?.token;
    if (token) {
      nextToken = token;
      break;
    }
  }

  return {
    hasReplies: repliesCount > 0,
    repliesCount,
    nextToken
  };
}

// Send raw reply data to content script for processing
async function sendReplyDataToContentScript(rawData: any, videoId: string, parentCommentId: string, tabId?: number): Promise<void> {
  return new Promise((resolve) => {
    const sendMessage = (id: number) => {
      chrome.tabs.sendMessage(
        id,
        {
          type: 'PROCESS_REPLY_DATA',
          videoId,
          parentCommentId,
          rawData
        },
        (response) => {
          if (chrome.runtime.lastError) {
            console.warn(`[BackgroundWorker] Failed to send reply data to tab ${id}:`, chrome.runtime.lastError);
          }
          resolve();
        }
      );
    };

    if (tabId) {
      sendMessage(tabId);
    } else {
      // Fallback to active tab if no tabId stored (legacy behavior)
      chrome.tabs.query({ url: '*://*.youtube.com/*' }, (tabs) => {
        const targetTab = tabs.find(tab => tab.active) || tabs[0];
        if (targetTab?.id) {
          sendMessage(targetTab.id);
        } else {
          console.warn('[BackgroundWorker] No YouTube tab found to send reply data');
          resolve();
        }
      });
    }
  });
}

// Build next request with updated continuation token
function buildNextRequest(currentRequest: PreparedRequest, nextToken: string): PreparedRequest {
  const body = JSON.parse(currentRequest.body);
  body.continuation = nextToken;

  return {
    ...currentRequest,
    body: JSON.stringify(body)
  };
}


// Notification helpers
function notifyTaskCompleted(task: ReplyFetchTask, repliesCount: number): void {
  broadcastToContentScript({
    type: MessageType.TASK_COMPLETED,
    taskId: task.id,
    videoId: task.videoId,
    parentCommentId: task.parentCommentId,
    repliesCount
  });
}

function notifyTaskFailed(task: ReplyFetchTask, error: string, willRetry: boolean): void {
  broadcastToContentScript({
    type: MessageType.TASK_FAILED,
    taskId: task.id,
    videoId: task.videoId,
    parentCommentId: task.parentCommentId,
    error,
    willRetry
  });
}

function notifyRateLimited(videoId: string, pauseDurationMs: number): void {
  broadcastToContentScript({
    type: MessageType.RATE_LIMITED,
    videoId,
    pauseDurationMs
  });
}

function checkAllTasksCompleted(videoId: string): void {
  const queue = getQueue(videoId);
  const workers = getActiveWorkers(videoId);
  const counts = getCompletedCounts(videoId);

  const pendingCount = queue.filter(t => t.status === TaskStatus.PENDING).length;

  if (pendingCount === 0 && workers.size === 0) {
    broadcastToContentScript({
      type: MessageType.ALL_TASKS_COMPLETED,
      videoId,
      totalReplies: counts.replies,
      failedTasks: counts.failed
    });

    console.log(`[BackgroundWorker] All tasks completed for video ${videoId}. Total replies: ${counts.replies}, Failed: ${counts.failed}`);
  }
}

function broadcastToContentScript(message: QueueMessage): void {
  chrome.tabs.query({ url: '*://*.youtube.com/*' }, (tabs) => {
    for (const tab of tabs) {
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, message).catch(() => {
          // Tab may not have content script loaded
        });
      }
    }
  });
}

// Update configuration
export function updateConfig(newConfig: Partial<WorkerPoolConfig>): void {
  config = { ...config, ...newConfig };
  console.log('[BackgroundWorker] Config updated:', config);
}

// Message handler for background script
export function handleMessage(
  message: any,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response?: any) => void
): boolean {
  const tabId = sender.tab?.id;

  switch (message.type) {
    case MessageType.QUEUE_REPLY_FETCH:
      const taskId = addTask(
        message.task.videoId,
        message.task.parentCommentId,
        message.task.continuationToken,
        message.task.preparedRequest,
        tabId
      );
      sendResponse({ taskId });
      return true;

    case MessageType.QUEUE_BATCH_REPLY_FETCH:
      const taskIds = addBatchTasks(message.tasks, tabId);
      sendResponse({ taskIds });
      return true;

    case MessageType.CANCEL_VIDEO_TASKS:
      cancelVideoTasks(message.videoId);
      sendResponse({ success: true });
      return true;

    case MessageType.GET_QUEUE_STATUS:
      const stats = getQueueStats(message.videoId);
      sendResponse(stats);
      return true;

    default:
      return false;
  }
}
