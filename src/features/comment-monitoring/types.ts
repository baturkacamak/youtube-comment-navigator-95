import type { Comment } from '../../types/commentTypes';

export interface SavedCommentSnapshot {
  commentId: string;
  author: string;
  content: string;
  published: string;
  detectedAt: number;
}

export interface MonitoredVideo {
  videoId: string;
  enabledAt: number;
  lastCheckedAt: number | null;
  nextCheckAt: number | null;
  intervalMinutes: number;
  lastNotifiedAt: number | null;
  lastKnownCount: number;
  lastKnownTotalCommentCount: number | null;
  lastSeenCommentIds: string[];
  lastError: string | null;
  title: string | null;
  publishedAt: string | null;
  savedComments: SavedCommentSnapshot[];
}

export interface MonitorStatus {
  monitored: boolean;
  apiKeyConfigured: boolean;
  lastCheckedAt: number | null;
  nextCheckAt: number | null;
  intervalMinutes: number | null;
  lastKnownCount: number;
  lastKnownTotalCommentCount: number | null;
  lastError: string | null;
}

export interface MonitorCheckResult {
  ok: boolean;
  monitored: boolean;
  apiKeyConfigured: boolean;
  lastCheckedAt: number | null;
  nextCheckAt: number | null;
  intervalMinutes: number | null;
  lastKnownCount: number;
  lastKnownTotalCommentCount: number | null;
  newCount: number;
  skipped?: boolean;
  error?: string;
}

export interface BackgroundCommentFetchResult {
  comments: Comment[];
  title: string | null;
  publishedAt: string | null;
  totalCommentCount: number | null;
}

export interface VideoCommentMonitorMetadata {
  title: string | null;
  publishedAt: string | null;
  totalCommentCount: number | null;
}
