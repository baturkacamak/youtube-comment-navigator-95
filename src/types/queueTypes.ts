/**
 * Types for the reply fetch queue system
 * Enables concurrent fetching of comment replies via background service worker
 */

// Task status enum
export enum TaskStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

// A single reply fetch task
export interface ReplyFetchTask {
  id: string;
  videoId: string;
  parentCommentId: string;
  continuationToken: string;
  status: TaskStatus;
  retryCount: number;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  error?: string;
  tabId?: number; // The tab that initiated this task
}

// Message types for content script <-> background communication
export enum MessageType {
  // Content Script -> Background
  QUEUE_REPLY_FETCH = 'QUEUE_REPLY_FETCH',
  QUEUE_BATCH_REPLY_FETCH = 'QUEUE_BATCH_REPLY_FETCH',
  CANCEL_VIDEO_TASKS = 'CANCEL_VIDEO_TASKS',
  GET_QUEUE_STATUS = 'GET_QUEUE_STATUS',

  // Background -> Content Script
  TASK_COMPLETED = 'TASK_COMPLETED',
  TASK_FAILED = 'TASK_FAILED',
  QUEUE_STATUS_UPDATE = 'QUEUE_STATUS_UPDATE',
  RATE_LIMITED = 'RATE_LIMITED',
  ALL_TASKS_COMPLETED = 'ALL_TASKS_COMPLETED'
}

// Message payloads
export interface QueueReplyFetchMessage {
  type: MessageType.QUEUE_REPLY_FETCH;
  task: {
    videoId: string;
    parentCommentId: string;
    continuationToken: string;
  };
}

export interface QueueBatchReplyFetchMessage {
  type: MessageType.QUEUE_BATCH_REPLY_FETCH;
  tasks: Array<{
    videoId: string;
    parentCommentId: string;
    continuationToken: string;
  }>;
}

export interface CancelVideoTasksMessage {
  type: MessageType.CANCEL_VIDEO_TASKS;
  videoId: string;
}

export interface GetQueueStatusMessage {
  type: MessageType.GET_QUEUE_STATUS;
  videoId?: string;
}

export interface TaskCompletedMessage {
  type: MessageType.TASK_COMPLETED;
  taskId: string;
  videoId: string;
  parentCommentId: string;
  repliesCount: number;
}

export interface TaskFailedMessage {
  type: MessageType.TASK_FAILED;
  taskId: string;
  videoId: string;
  parentCommentId: string;
  error: string;
  willRetry: boolean;
}

export interface QueueStatusUpdateMessage {
  type: MessageType.QUEUE_STATUS_UPDATE;
  videoId: string;
  pendingCount: number;
  inProgressCount: number;
  completedCount: number;
  failedCount: number;
}

export interface RateLimitedMessage {
  type: MessageType.RATE_LIMITED;
  videoId: string;
  pauseDurationMs: number;
}

export interface AllTasksCompletedMessage {
  type: MessageType.ALL_TASKS_COMPLETED;
  videoId: string;
  totalReplies: number;
  failedTasks: number;
}

// Union type for all messages
export type QueueMessage =
  | QueueReplyFetchMessage
  | QueueBatchReplyFetchMessage
  | CancelVideoTasksMessage
  | GetQueueStatusMessage
  | TaskCompletedMessage
  | TaskFailedMessage
  | QueueStatusUpdateMessage
  | RateLimitedMessage
  | AllTasksCompletedMessage;

// Worker pool configuration
export interface WorkerPoolConfig {
  maxConcurrency: number;
  retryLimit: number;
  retryDelayMs: number;
  rateLimitPauseMs: number;
  taskTimeoutMs: number;
}

// Default worker pool configuration
export const DEFAULT_WORKER_POOL_CONFIG: WorkerPoolConfig = {
  maxConcurrency: 3, // Start conservative, can be increased
  retryLimit: 3,
  retryDelayMs: 1000,
  rateLimitPauseMs: 5000,
  taskTimeoutMs: 30000
};

// Queue statistics
export interface QueueStats {
  totalTasks: number;
  pendingTasks: number;
  inProgressTasks: number;
  completedTasks: number;
  failedTasks: number;
  totalRepliesFetched: number;
  isRateLimited: boolean;
  currentConcurrency: number;
}
