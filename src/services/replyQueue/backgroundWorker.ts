/**
 * Background Worker for Reply Fetch Queue
 * Handles concurrent fetching of comment replies with rate limiting and backoff
 *
 * Features:
 * - Concurrent task execution with configurable concurrency limit
 * - Automatic retry with exponential backoff
 * - Rate limit detection and adaptive concurrency
 * - Task cancellation and cleanup
 * - Comprehensive error handling and logging
 * - Tab ID tracking for targeted message delivery
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
import { backgroundWorkerLogger as logger, taskExecutorLogger } from './queueLogger';

// ============================================================================
// Types
// ============================================================================

/** Request context prepared by content script */
export interface PreparedRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string;
}

/** Extended task with prepared request */
export interface ReplyFetchTaskWithRequest extends ReplyFetchTask {
  preparedRequest: PreparedRequest;
}

/** Result of task execution */
interface TaskExecutionResult {
  success: boolean;
  repliesCount?: number;
  nextContinuationToken?: string;
  nextPreparedRequest?: PreparedRequest;
  error?: string;
  errorCode?: string;
  rateLimited?: boolean;
  retryable?: boolean;
}

/** Error codes for categorizing failures */
export enum ErrorCode {
  NETWORK_ERROR = 'NETWORK_ERROR',
  RATE_LIMITED = 'RATE_LIMITED',
  INVALID_RESPONSE = 'INVALID_RESPONSE',
  PARSE_ERROR = 'PARSE_ERROR',
  TIMEOUT = 'TIMEOUT',
  CANCELLED = 'CANCELLED',
  TAB_NOT_FOUND = 'TAB_NOT_FOUND',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  UNKNOWN = 'UNKNOWN'
}

// ============================================================================
// State Management
// ============================================================================

// In-memory queue storage
const taskQueues = new Map<string, ReplyFetchTaskWithRequest[]>();
const activeWorkers = new Map<string, Set<string>>();
const completedCounts = new Map<string, { replies: number; completed: number; failed: number }>();

// Configuration and rate limiting state
let config: WorkerPoolConfig = { ...DEFAULT_WORKER_POOL_CONFIG };
let isRateLimited = false;
let rateLimitEndTime = 0;
let originalMaxConcurrency = config.maxConcurrency;

// Processing state
const processingTimers = new Map<string, ReturnType<typeof setTimeout>>();

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generate unique task ID with timestamp and random component
 */
function generateTaskId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 9);
  return `task_${timestamp}_${random}`;
}

/**
 * Validate video ID format
 */
function isValidVideoId(videoId: string): boolean {
  if (!videoId || typeof videoId !== 'string') {
    return false;
  }
  // YouTube video IDs are 11 characters, alphanumeric with - and _
  return /^[a-zA-Z0-9_-]{11}$/.test(videoId);
}

/**
 * Validate prepared request structure
 */
function isValidPreparedRequest(request: PreparedRequest): boolean {
  if (!request || typeof request !== 'object') {
    return false;
  }
  if (!request.url || typeof request.url !== 'string') {
    return false;
  }
  if (!request.method || typeof request.method !== 'string') {
    return false;
  }
  if (!request.headers || typeof request.headers !== 'object') {
    return false;
  }
  if (typeof request.body !== 'string') {
    return false;
  }
  return true;
}

// ============================================================================
// Queue Management
// ============================================================================

/**
 * Get or create queue for video with validation
 */
function getQueue(videoId: string): ReplyFetchTaskWithRequest[] {
  if (!videoId) {
    logger.error('getQueue called with empty videoId');
    return [];
  }

  if (!taskQueues.has(videoId)) {
    taskQueues.set(videoId, []);
    logger.debug(`Created new queue for video ${videoId}`);
  }
  return taskQueues.get(videoId)!;
}

/**
 * Get or create active workers set for video
 */
function getActiveWorkers(videoId: string): Set<string> {
  if (!videoId) {
    logger.error('getActiveWorkers called with empty videoId');
    return new Set();
  }

  if (!activeWorkers.has(videoId)) {
    activeWorkers.set(videoId, new Set());
  }
  return activeWorkers.get(videoId)!;
}

/**
 * Get or create completed counts for video
 */
function getCompletedCounts(videoId: string): { replies: number; completed: number; failed: number } {
  if (!completedCounts.has(videoId)) {
    completedCounts.set(videoId, { replies: 0, completed: 0, failed: 0 });
  }
  return completedCounts.get(videoId)!;
}

/**
 * Clean up resources for a video
 */
function cleanupVideo(videoId: string): void {
  // Cancel any pending processing timers
  const timer = processingTimers.get(videoId);
  if (timer) {
    clearTimeout(timer);
    processingTimers.delete(videoId);
  }

  taskQueues.delete(videoId);
  activeWorkers.delete(videoId);
  completedCounts.delete(videoId);

  logger.debug(`Cleaned up resources for video ${videoId}`);
}

// ============================================================================
// Task Management
// ============================================================================

/**
 * Add a single task to the queue
 */
export function addTask(
  videoId: string,
  parentCommentId: string,
  continuationToken: string,
  preparedRequest: PreparedRequest,
  tabId?: number
): string {
  // Validate inputs first before any operations that use them
  if (!isValidVideoId(videoId)) {
    const error = `Invalid video ID: ${videoId}`;
    logger.error('Invalid video ID provided to addTask', { videoId });
    throw new Error(error);
  }

  if (!parentCommentId || typeof parentCommentId !== 'string') {
    logger.error('Invalid parent comment ID', { parentCommentId });
    throw new Error('Invalid parent comment ID');
  }

  if (!continuationToken || typeof continuationToken !== 'string') {
    logger.error('Invalid continuation token', { tokenLength: continuationToken?.length });
    throw new Error('Invalid continuation token');
  }

  if (!isValidPreparedRequest(preparedRequest)) {
    logger.error('Invalid prepared request', { url: preparedRequest?.url });
    throw new Error('Invalid prepared request');
  }

  // Start timer after validation passes
  const timerId = `addTask_${parentCommentId.substring(0, 10)}`;
  logger.startTimer(timerId);

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

  logger.info(`Added task ${taskId}`, {
    videoId,
    parentCommentId: parentCommentId.substring(0, 20),
    queueSize: queue.length,
    tabId
  });

  logger.endTimer(timerId);

  // Trigger processing
  scheduleProcessing(videoId);

  return taskId;
}

/**
 * Add multiple tasks at once (batch operation)
 */
export function addBatchTasks(
  tasks: Array<{
    videoId: string;
    parentCommentId: string;
    continuationToken: string;
    preparedRequest: PreparedRequest;
  }>,
  tabId?: number
): string[] {
  logger.startTimer('addBatchTasks');

  if (!Array.isArray(tasks) || tasks.length === 0) {
    logger.warn('addBatchTasks called with empty or invalid tasks array');
    return [];
  }

  const taskIds: string[] = [];
  const videoIds = new Set<string>();
  const errors: string[] = [];

  for (let i = 0; i < tasks.length; i++) {
    const taskData = tasks[i];

    try {
      // Validate each task
      if (!isValidVideoId(taskData.videoId)) {
        throw new Error(`Invalid video ID at index ${i}`);
      }
      if (!taskData.parentCommentId) {
        throw new Error(`Missing parent comment ID at index ${i}`);
      }
      if (!taskData.continuationToken) {
        throw new Error(`Missing continuation token at index ${i}`);
      }
      if (!isValidPreparedRequest(taskData.preparedRequest)) {
        throw new Error(`Invalid prepared request at index ${i}`);
      }

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
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      errors.push(errorMsg);
      logger.warn(`Skipping invalid task at index ${i}`, { error: errorMsg });
    }
  }

  if (errors.length > 0) {
    logger.warn(`Batch add completed with ${errors.length} errors`, { errorCount: errors.length });
  }

  logger.info(`Added ${taskIds.length} batch tasks`, {
    totalRequested: tasks.length,
    added: taskIds.length,
    errors: errors.length,
    videoCount: videoIds.size,
    tabId
  });

  logger.endTimer('addBatchTasks');

  // Trigger processing for all affected videos
  for (const videoId of videoIds) {
    scheduleProcessing(videoId);
  }

  return taskIds;
}

/**
 * Cancel all tasks for a video
 */
export function cancelVideoTasks(videoId: string): void {
  logger.startTimer(`cancelVideoTasks_${videoId}`);

  if (!videoId) {
    logger.error('cancelVideoTasks called with empty videoId');
    return;
  }

  const queue = taskQueues.get(videoId);
  const cancelledCount = queue ? queue.filter(t => t.status === TaskStatus.PENDING).length : 0;
  const inProgressCount = queue ? queue.filter(t => t.status === TaskStatus.IN_PROGRESS).length : 0;

  // Mark all pending tasks as cancelled
  if (queue) {
    for (const task of queue) {
      if (task.status === TaskStatus.PENDING) {
        task.status = TaskStatus.CANCELLED;
      }
    }
  }

  // Clean up all resources
  cleanupVideo(videoId);

  logger.info(`Cancelled tasks for video ${videoId}`, {
    cancelledCount,
    inProgressCount,
    note: inProgressCount > 0 ? 'In-progress tasks will complete' : undefined
  });

  logger.endTimer(`cancelVideoTasks_${videoId}`);
}

/**
 * Get queue statistics
 */
export function getQueueStats(videoId?: string): QueueStats {
  try {
    if (videoId) {
      const queue = taskQueues.get(videoId) || [];
      const workers = activeWorkers.get(videoId) || new Set();
      const counts = completedCounts.get(videoId) || { replies: 0, completed: 0, failed: 0 };

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
      inProgressTasks += (activeWorkers.get(vid)?.size || 0);
      const counts = completedCounts.get(vid);
      if (counts) {
        completedTasks += counts.completed;
        failedTasks += counts.failed;
        totalReplies += counts.replies;
      }
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
  } catch (error) {
    logger.error('Error getting queue stats', { videoId }, error as Error);
    return {
      totalTasks: 0,
      pendingTasks: 0,
      inProgressTasks: 0,
      completedTasks: 0,
      failedTasks: 0,
      totalRepliesFetched: 0,
      isRateLimited: false,
      currentConcurrency: 0
    };
  }
}

// ============================================================================
// Queue Processing
// ============================================================================

/**
 * Schedule queue processing with debouncing
 */
function scheduleProcessing(videoId: string, delayMs: number = 0): void {
  // Cancel existing timer
  const existingTimer = processingTimers.get(videoId);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  // Schedule new processing
  const timer = setTimeout(() => {
    processingTimers.delete(videoId);
    processQueue(videoId).catch(error => {
      logger.error('Error in processQueue', { videoId }, error as Error);
    });
  }, delayMs);

  processingTimers.set(videoId, timer);
}

/**
 * Process queue for a specific video
 */
async function processQueue(videoId: string): Promise<void> {
  const queue = taskQueues.get(videoId);
  if (!queue) {
    logger.debug(`No queue found for video ${videoId}`);
    return;
  }

  const workers = getActiveWorkers(videoId);

  // Check rate limiting
  if (isRateLimited) {
    const remainingTime = rateLimitEndTime - Date.now();
    if (remainingTime > 0) {
      logger.info(`Rate limited, scheduling retry`, {
        videoId,
        remainingMs: remainingTime
      });
      scheduleProcessing(videoId, remainingTime);
      return;
    } else {
      // Rate limit period ended
      isRateLimited = false;
      // Gradually restore concurrency
      if (config.maxConcurrency < originalMaxConcurrency) {
        config.maxConcurrency = Math.min(config.maxConcurrency + 1, originalMaxConcurrency);
        logger.info(`Rate limit ended, restored concurrency to ${config.maxConcurrency}`);
      }
    }
  }

  // Find and start pending tasks up to max concurrency
  let tasksStarted = 0;
  while (workers.size < config.maxConcurrency) {
    const pendingTask = queue.find(t => t.status === TaskStatus.PENDING);
    if (!pendingTask) break;

    pendingTask.status = TaskStatus.IN_PROGRESS;
    pendingTask.startedAt = Date.now();
    workers.add(pendingTask.id);
    tasksStarted++;

    // Execute task asynchronously
    executeTaskWithRetry(pendingTask, videoId);
  }

  if (tasksStarted > 0) {
    logger.debug(`Started ${tasksStarted} tasks`, {
      videoId,
      activeWorkers: workers.size,
      maxConcurrency: config.maxConcurrency,
      pendingInQueue: queue.filter(t => t.status === TaskStatus.PENDING).length
    });
  }
}

/**
 * Execute a task with retry logic
 */
async function executeTaskWithRetry(task: ReplyFetchTaskWithRequest, videoId: string): Promise<void> {
  const workers = getActiveWorkers(videoId);

  try {
    taskExecutorLogger.startTimer(`task_${task.id}`);
    const result = await executeTask(task);
    const duration = taskExecutorLogger.endTimer(`task_${task.id}`);

    workers.delete(task.id);

    if (result.success) {
      handleTaskSuccess(task, videoId, result, duration);
    } else {
      handleTaskFailure(task, videoId, result);
    }
  } catch (error) {
    workers.delete(task.id);
    taskExecutorLogger.endTimer(`task_${task.id}`);

    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Unexpected error executing task ${task.id}`, {
      error: errorMessage,
      parentCommentId: task.parentCommentId
    }, error as Error);

    handleTaskFailure(task, videoId, {
      success: false,
      error: errorMessage,
      errorCode: ErrorCode.UNKNOWN,
      retryable: true
    });
  }
}

/**
 * Handle successful task completion
 */
function handleTaskSuccess(
  task: ReplyFetchTaskWithRequest,
  videoId: string,
  result: TaskExecutionResult,
  durationMs: number
): void {
  task.status = TaskStatus.COMPLETED;
  task.completedAt = Date.now();

  const counts = getCompletedCounts(videoId);
  counts.completed++;
  counts.replies += result.repliesCount || 0;

  logger.success(`Task ${task.id} completed`, {
    parentCommentId: task.parentCommentId.substring(0, 20),
    repliesCount: result.repliesCount,
    durationMs: Math.round(durationMs),
    hasMoreReplies: !!result.nextContinuationToken
  });

  // Notify content script
  notifyTaskCompleted(task, result.repliesCount || 0);

  // Log metrics
  logger.metric('task_duration', durationMs, 'ms', { videoId, status: 'success' });
  if (result.repliesCount) {
    logger.metric('replies_fetched', result.repliesCount, '', { videoId });
  }

  // If there are more replies (pagination), add continuation task
  if (result.nextContinuationToken && result.nextPreparedRequest) {
    logger.debug(`Adding continuation task for comment`, {
      parentCommentId: task.parentCommentId.substring(0, 20)
    });
    try {
      addTask(videoId, task.parentCommentId, result.nextContinuationToken, result.nextPreparedRequest, task.tabId);
    } catch (error) {
      logger.error('Failed to add continuation task', {
        parentCommentId: task.parentCommentId
      }, error as Error);
    }
  }

  // Check completion and continue processing
  checkAllTasksCompleted(videoId);
  scheduleProcessing(videoId);
}

/**
 * Handle task failure
 */
function handleTaskFailure(
  task: ReplyFetchTaskWithRequest,
  videoId: string,
  result: TaskExecutionResult
): void {
  const shouldRetry = result.retryable !== false &&
    task.retryCount < config.retryLimit &&
    !result.rateLimited;

  if (shouldRetry) {
    // Retry the task with exponential backoff
    task.status = TaskStatus.PENDING;
    task.retryCount++;
    task.error = result.error;

    const retryDelay = config.retryDelayMs * Math.pow(2, task.retryCount - 1);

    logger.warn(`Retrying task ${task.id}`, {
      attempt: task.retryCount,
      maxRetries: config.retryLimit,
      retryDelayMs: retryDelay,
      error: result.error,
      errorCode: result.errorCode
    });

    scheduleProcessing(videoId, retryDelay);
    return;
  }

  // Task failed permanently
  task.status = TaskStatus.FAILED;
  task.completedAt = Date.now();
  task.error = result.error;

  const counts = getCompletedCounts(videoId);
  counts.failed++;

  logger.error(`Task ${task.id} failed permanently`, {
    parentCommentId: task.parentCommentId.substring(0, 20),
    error: result.error,
    errorCode: result.errorCode,
    attempts: task.retryCount + 1
  });

  // Log metrics
  logger.metric('task_failed', 1, '', { videoId, errorCode: result.errorCode || 'unknown' });

  notifyTaskFailed(task, result.error || 'Unknown error', false);
  checkAllTasksCompleted(videoId);
  scheduleProcessing(videoId);
}

// ============================================================================
// Task Execution
// ============================================================================

/**
 * Make HTTP request from content script context to get proper browser headers
 * Service worker requests don't get Referer, sec-fetch-site, etc. which triggers bot detection
 */
async function makeRequestFromContentScript(
  preparedRequest: PreparedRequest,
  tabId: number,
  signal: AbortSignal
): Promise<{ success: boolean; response?: Response; error?: string }> {
  return new Promise((resolve) => {
    const requestId = generateTaskId();
    const timeout = setTimeout(() => {
      resolve({ success: false, error: 'Timeout waiting for content script response' });
    }, 30000);

    // Listen for response from content script
    const messageListener = (message: any) => {
      if (message.type === 'FETCH_RESPONSE' && message.requestId === requestId) {
        clearTimeout(timeout);
        chrome.runtime.onMessage.removeListener(messageListener);

        if (message.success && message.responseData) {
          // Reconstruct Response object from serialized data
          const response = new Response(message.responseData.body, {
            status: message.responseData.status,
            statusText: message.responseData.statusText,
            headers: message.responseData.headers
          });
          resolve({ success: true, response });
        } else {
          resolve({ success: false, error: message.error || 'Unknown error from content script' });
        }
      }
    };

    chrome.runtime.onMessage.addListener(messageListener);

    // Check if signal is already aborted
    if (signal.aborted) {
      clearTimeout(timeout);
      chrome.runtime.onMessage.removeListener(messageListener);
      resolve({ success: false, error: 'Request aborted' });
      return;
    }

    // Send request to content script
    chrome.tabs.sendMessage(tabId, {
      type: 'MAKE_FETCH_REQUEST',
      requestId,
      preparedRequest
    }).catch((error) => {
      clearTimeout(timeout);
      chrome.runtime.onMessage.removeListener(messageListener);
      resolve({ success: false, error: `Failed to send message to content script: ${error.message}` });
    });
  });
}

/**
 * Execute a single fetch task
 */
async function executeTask(task: ReplyFetchTaskWithRequest): Promise<TaskExecutionResult> {
  taskExecutorLogger.debug(`Executing task ${task.id}`, {
    parentCommentId: task.parentCommentId.substring(0, 20),
    attempt: task.retryCount + 1
  });

  // Add delay before request to avoid bot detection
  // Add random jitter (±30%) to make timing more human-like
  if (config.requestDelayMs > 0) {
    const jitter = (Math.random() - 0.5) * 0.6; // ±30%
    const actualDelay = Math.floor(config.requestDelayMs * (1 + jitter));
    taskExecutorLogger.debug(`Delaying request by ${actualDelay}ms to avoid bot detection`);
    await new Promise(resolve => setTimeout(resolve, actualDelay));
  }

  let response: Response;

  try {
  // Create abort controller for timeout
  taskExecutorLogger.debug(`Making fetch request for task ${task.id}`, {
    url: task.preparedRequest.url,
    method: task.preparedRequest.method,
    hasAuth: !!task.preparedRequest.headers['Authorization'],
    hasBody: !!task.preparedRequest.body,
    bodyLength: task.preparedRequest.body?.length || 0,
    headerKeys: Object.keys(task.preparedRequest.headers).join(', ')
  });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), config.taskTimeoutMs);

  try {
    // Validate tabId
    if (!task.tabId) {
      clearTimeout(timeoutId);
      return {
        success: false,
        error: 'No tab ID available for request',
        errorCode: ErrorCode.TAB_NOT_FOUND,
        retryable: false
      };
    }

    // Make request from content script context to get proper browser headers
    // This avoids bot detection that happens with service worker requests
    const fetchResult = await makeRequestFromContentScript(
      task.preparedRequest,
      task.tabId,
      controller.signal
    );
    
    if (!fetchResult.success) {
      clearTimeout(timeoutId);
      return {
        success: false,
        error: fetchResult.error || 'Failed to make request from content script',
        errorCode: ErrorCode.NETWORK_ERROR,
        retryable: true
      };
    }
    
    response = fetchResult.response!;
    
    taskExecutorLogger.debug(`Fetch completed for task ${task.id}`, {
      status: response.status,
      ok: response.ok,
      statusText: response.statusText,
      headers: {
        contentType: response.headers.get('content-type'),
        contentLength: response.headers.get('content-length')
      }
    });
  } finally {
    clearTimeout(timeoutId);
  }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      taskExecutorLogger.warn(`Task ${task.id} timed out`, {
        timeoutMs: config.taskTimeoutMs
      });
      return {
        success: false,
        error: `Request timed out after ${config.taskTimeoutMs}ms`,
        errorCode: ErrorCode.TIMEOUT,
        retryable: true
      };
    }

    const errorMsg = error instanceof Error ? error.message : String(error);
    taskExecutorLogger.error(`Network error for task ${task.id}`, {
      error: errorMsg
    });
    return {
      success: false,
      error: `Network error: ${errorMsg}`,
      errorCode: ErrorCode.NETWORK_ERROR,
      retryable: true
    };
  }

  // Handle rate limiting (HTTP 429)
  if (response.status === 429) {
    return handleRateLimitResponse(task);
  }

  // Handle other HTTP errors
  if (!response.ok) {
    let errorText = '';
    try {
      errorText = await response.text();
    } catch {
      errorText = 'Unable to read error response';
    }

    taskExecutorLogger.error(`HTTP error for task ${task.id}`, {
      status: response.status,
      statusText: response.statusText,
      url: task.preparedRequest.url,
      method: task.preparedRequest.method,
      headers: task.preparedRequest.headers,
      bodyPreview: errorText.substring(0, 500),
      videoId: task.videoId,
      parentCommentId: task.parentCommentId
    });

    return {
      success: false,
      error: `HTTP ${response.status}: ${response.statusText}`,
      errorCode: ErrorCode.INVALID_RESPONSE,
      retryable: response.status >= 500 // Retry server errors only
    };
  }

  // Log successful response
  taskExecutorLogger.debug(`Received response for task ${task.id}`, {
    status: response.status,
    contentType: response.headers.get('content-type'),
    videoId: task.videoId
  });

  // Parse response
  let data: any;
  let responseText: string = '';
  try {
    responseText = await response.text();
    taskExecutorLogger.debug(`Response text length: ${responseText.length} characters`);
    data = JSON.parse(responseText);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    taskExecutorLogger.error(`Failed to parse JSON for task ${task.id}`, {
      error: errorMsg,
      responsePreview: responseText.substring(0, 500),
      responseLength: responseText.length
    });
    return {
      success: false,
      error: 'Failed to parse JSON response',
      errorCode: ErrorCode.PARSE_ERROR,
      retryable: false
    };
  }

  // Validate response structure
  if (!data || typeof data !== 'object') {
    taskExecutorLogger.error(`Invalid response structure for task ${task.id}`, {
      dataType: typeof data,
      dataPreview: JSON.stringify(data).substring(0, 500)
    });
    return {
      success: false,
      error: 'Invalid response structure',
      errorCode: ErrorCode.INVALID_RESPONSE,
      retryable: false
    };
  }
  
  taskExecutorLogger.debug(`Response parsed successfully`, {
    hasOnResponseReceivedEndpoints: !!data?.onResponseReceivedEndpoints,
    topLevelKeys: Object.keys(data || {}).join(', ')
  });

  // Parse reply data
  const parseResult = parseReplyResponse(data);

  // Send raw data to content script for processing
  if (parseResult.hasReplies) {
    const sendResult = await sendReplyDataToContentScript(data, task.videoId, task.parentCommentId, task.tabId);
    if (!sendResult.success) {
      taskExecutorLogger.warn(`Failed to send reply data to content script`, {
        taskId: task.id,
        error: sendResult.error
      });
      // Don't fail the task, just log the warning - data was fetched successfully
    }
  }

  return {
    success: true,
    repliesCount: parseResult.repliesCount,
    nextContinuationToken: parseResult.nextToken,
    nextPreparedRequest: parseResult.nextToken ? buildNextRequest(task.preparedRequest, parseResult.nextToken) : undefined
  };
}

/**
 * Handle rate limit response
 */
function handleRateLimitResponse(task: ReplyFetchTaskWithRequest): TaskExecutionResult {
  isRateLimited = true;
  rateLimitEndTime = Date.now() + config.rateLimitPauseMs;

  // Reduce concurrency more aggressively
  const previousConcurrency = config.maxConcurrency;
  config.maxConcurrency = Math.max(1, Math.floor(config.maxConcurrency / 2));

  logger.warn(`Rate limited! Reducing concurrency`, {
    taskId: task.id,
    previousConcurrency,
    newConcurrency: config.maxConcurrency,
    pauseDurationMs: config.rateLimitPauseMs,
    resumeAt: new Date(rateLimitEndTime).toISOString()
  });

  // Log metric
  logger.metric('rate_limit_hit', 1, '', { videoId: task.videoId });

  // Notify content script
  notifyRateLimited(task.videoId, config.rateLimitPauseMs);

  return {
    success: false,
    error: 'Rate limited by YouTube',
    errorCode: ErrorCode.RATE_LIMITED,
    rateLimited: true,
    retryable: false // Will be retried automatically after rate limit period
  };
}

/**
 * Parse YouTube API response for replies
 */
function parseReplyResponse(data: any): {
  hasReplies: boolean;
  repliesCount: number;
  nextToken?: string;
} {
  let nextToken: string | undefined;
  let repliesCount = 0;

  try {
    // Extract continuation items from various response paths
    const continuationItems =
      data.onResponseReceivedEndpoints?.[0]?.appendContinuationItemsAction?.continuationItems ||
      data.onResponseReceivedEndpoints?.[1]?.reloadContinuationItemsCommand?.continuationItems ||
      [];

    // Count mutations (comment data in new format)
    const mutations = data.frameworkUpdates?.entityBatchUpdate?.mutations || [];
    for (const mutation of mutations) {
      if (mutation?.payload?.commentEntityPayload) {
        repliesCount++;
      }
    }

    // Find next continuation token
    for (const item of continuationItems) {
      const token = item?.continuationItemRenderer?.continuationEndpoint?.continuationCommand?.token;
      if (token && typeof token === 'string') {
        nextToken = token;
        break;
      }
    }

    taskExecutorLogger.debug(`Parsed reply response`, {
      repliesCount,
      hasNextToken: !!nextToken,
      mutationsCount: mutations.length,
      continuationItemsCount: continuationItems.length
    });
  } catch (error) {
    taskExecutorLogger.warn(`Error parsing reply response`, {
      error: error instanceof Error ? error.message : String(error)
    });
  }

  return {
    hasReplies: repliesCount > 0,
    repliesCount,
    nextToken
  };
}

/**
 * Build next request with updated continuation token
 */
function buildNextRequest(currentRequest: PreparedRequest, nextToken: string): PreparedRequest {
  try {
    const body = JSON.parse(currentRequest.body);
    body.continuation = nextToken;

    return {
      ...currentRequest,
      body: JSON.stringify(body)
    };
  } catch (error) {
    taskExecutorLogger.error(`Failed to build next request`, {
      error: error instanceof Error ? error.message : String(error)
    });
    throw new Error('Failed to build continuation request');
  }
}

// ============================================================================
// Content Script Communication
// ============================================================================

/**
 * Send raw reply data to content script for processing
 */
async function sendReplyDataToContentScript(
  rawData: any,
  videoId: string,
  parentCommentId: string,
  tabId?: number
): Promise<{ success: boolean; error?: string }> {
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
            logger.debug('Content script not responding', {
              tabId: id,
              error: chrome.runtime.lastError.message
            });
            resolve({ success: false, error: chrome.runtime.lastError.message });
            return;
          }
          resolve({ success: response?.success ?? true });
        }
      );
    };

    if (tabId) {
      sendMessage(tabId);
    } else {
      // Fallback to querying for YouTube tabs
      try {
        chrome.tabs.query({ url: '*://*.youtube.com/*' }, (tabs) => {
          if (chrome.runtime.lastError) {
            const error = chrome.runtime.lastError.message || 'Unknown tab query error';
            logger.warn('Failed to query tabs', { error });
            resolve({ success: false, error });
            return;
          }

          if (!tabs || tabs.length === 0) {
            logger.warn('No YouTube tabs found');
            resolve({ success: false, error: ErrorCode.TAB_NOT_FOUND });
            return;
          }

          // Prefer active tab, fallback to first YouTube tab
          const targetTab = tabs.find(tab => tab.active) || tabs[0];

          if (!targetTab?.id) {
            logger.warn('Target tab has no ID');
            resolve({ success: false, error: 'Tab has no ID' });
            return;
          }

          sendMessage(targetTab.id);
        });
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        logger.error('Exception querying tabs', { error: errorMsg });
        resolve({ success: false, error: errorMsg });
      }
    }
  });
}

/**
 * Broadcast message to all YouTube tabs
 */
function broadcastToContentScript(message: QueueMessage): void {
  try {
    chrome.tabs.query({ url: '*://*.youtube.com/*' }, (tabs) => {
      if (chrome.runtime.lastError) {
        logger.debug('Failed to query tabs for broadcast', {
          error: chrome.runtime.lastError.message
        });
        return;
      }

      if (!tabs || tabs.length === 0) {
        return;
      }

      let sentCount = 0;
      for (const tab of tabs) {
        if (tab.id) {
          chrome.tabs.sendMessage(tab.id, message).then(() => {
            sentCount++;
          }).catch(() => {
            // Silently ignore - tab may not have content script
          });
        }
      }

      logger.debug(`Broadcast message sent`, {
        type: message.type,
        tabCount: tabs.length
      });
    });
  } catch (error) {
    logger.debug('Exception broadcasting to content script', {
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

// ============================================================================
// Notification Helpers
// ============================================================================

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
  const queue = taskQueues.get(videoId);
  if (!queue) return;

  const workers = activeWorkers.get(videoId) || new Set();
  const counts = completedCounts.get(videoId) || { replies: 0, completed: 0, failed: 0 };

  const pendingCount = queue.filter(t => t.status === TaskStatus.PENDING).length;
  const inProgressCount = queue.filter(t => t.status === TaskStatus.IN_PROGRESS).length;

  if (pendingCount === 0 && inProgressCount === 0 && workers.size === 0) {
    const totalTime = Date.now() - Math.min(...queue.map(t => t.createdAt));

    logger.success(`All tasks completed for video ${videoId}`, {
      totalReplies: counts.replies,
      completedTasks: counts.completed,
      failedTasks: counts.failed,
      totalTimeMs: totalTime
    });

    // Log final metrics
    logger.metric('video_total_replies', counts.replies, '', { videoId });
    logger.metric('video_completed_tasks', counts.completed, '', { videoId });
    logger.metric('video_failed_tasks', counts.failed, '', { videoId });
    logger.metric('video_total_time', totalTime, 'ms', { videoId });

    broadcastToContentScript({
      type: MessageType.ALL_TASKS_COMPLETED,
      videoId,
      totalReplies: counts.replies,
      failedTasks: counts.failed
    });
  }
}

// ============================================================================
// Configuration
// ============================================================================

/**
 * Update worker pool configuration
 */
export function updateConfig(newConfig: Partial<WorkerPoolConfig>): void {
  const previousConfig = { ...config };
  config = { ...config, ...newConfig };

  if (newConfig.maxConcurrency !== undefined) {
    originalMaxConcurrency = newConfig.maxConcurrency;
  }

  logger.info('Configuration updated', {
    previous: previousConfig,
    current: config
  });
}

/**
 * Get current configuration
 */
export function getConfig(): WorkerPoolConfig {
  return { ...config };
}

/**
 * Reset rate limiting state (useful for testing or manual recovery)
 */
export function resetRateLimitState(): void {
  isRateLimited = false;
  rateLimitEndTime = 0;
  config.maxConcurrency = originalMaxConcurrency;
  logger.info('Rate limit state reset', { maxConcurrency: config.maxConcurrency });
}

/**
 * Clear all queues (useful for testing or cleanup)
 */
export function clearAllQueues(): void {
  const videoIds = Array.from(taskQueues.keys());

  for (const videoId of videoIds) {
    cleanupVideo(videoId);
  }

  logger.info('All queues cleared', { videoCount: videoIds.length });
}

// ============================================================================
// Message Handler
// ============================================================================

/**
 * Message handler for background script
 */
export function handleMessage(
  message: any,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response?: any) => void
): boolean {
  const messageType = message?.type;
  const tabId = sender.tab?.id;

  logger.debug('Received message', {
    type: messageType,
    tabId
  });

  try {
    switch (messageType) {
      case MessageType.QUEUE_REPLY_FETCH: {
        if (!message.task) {
          logger.warn('QUEUE_REPLY_FETCH missing task data');
          sendResponse({ error: 'Missing task data' });
          return true;
        }

        try {
          const taskId = addTask(
            message.task.videoId,
            message.task.parentCommentId,
            message.task.continuationToken,
            message.task.preparedRequest,
            tabId
          );
          sendResponse({ taskId });
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          logger.error('Failed to add task', { error: errorMsg });
          sendResponse({ error: errorMsg });
        }
        return true;
      }

      case MessageType.QUEUE_BATCH_REPLY_FETCH: {
        if (!Array.isArray(message.tasks)) {
          logger.warn('QUEUE_BATCH_REPLY_FETCH invalid tasks array');
          sendResponse({ error: 'Invalid tasks array', taskIds: [] });
          return true;
        }

        try {
          const taskIds = addBatchTasks(message.tasks, tabId);
          sendResponse({ taskIds });
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          logger.error('Failed to add batch tasks', { error: errorMsg });
          sendResponse({ error: errorMsg, taskIds: [] });
        }
        return true;
      }

      case MessageType.CANCEL_VIDEO_TASKS: {
        if (!message.videoId) {
          logger.warn('CANCEL_VIDEO_TASKS missing videoId');
          sendResponse({ error: 'Missing videoId', success: false });
          return true;
        }

        try {
          cancelVideoTasks(message.videoId);
          sendResponse({ success: true });
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          logger.error('Failed to cancel video tasks', { error: errorMsg });
          sendResponse({ error: errorMsg, success: false });
        }
        return true;
      }

      case MessageType.GET_QUEUE_STATUS: {
        try {
          const stats = getQueueStats(message.videoId);
          sendResponse(stats);
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          logger.error('Failed to get queue stats', { error: errorMsg });
          sendResponse({ error: errorMsg });
        }
        return true;
      }

      default:
        // Unknown message type - don't handle
        return false;
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error('Unhandled error in message handler', {
      type: messageType,
      error: errorMsg
    });
    sendResponse({ error: errorMsg });
    return true;
  }
}

// Log initialization
logger.info('Background worker initialized', {
  config: DEFAULT_WORKER_POOL_CONFIG
});
