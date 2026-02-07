// src/features/comments/hooks/useCommentsFromDB.ts
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useSelector } from 'react-redux';
import { db } from '../../shared/utils/database/database';
import { Comment } from '../../../types/commentTypes';
import { FilterState } from '../../../types/filterTypes';
import { loadPagedComments, countComments } from '../services/pagination';
import { PAGINATION } from '../../shared/utils/appConstants';
import logger from '../../shared/utils/logger';
import { dbEvents } from '../../shared/utils/database/dbEvents';
import { throttle } from '../../shared/utils/debounce';
import { selectIsLoading } from '../../../store/selectors';

/** Throttle interval for UI updates during heavy fetching (ms) */
const UI_UPDATE_THROTTLE_MS = 1000;

export interface UseCommentsFromDBOptions {
  videoId: string | null;
  filters: FilterState;
  searchKeyword: string;
  pageSize?: number;
  topLevelOnly?: boolean;
  excludeLiveChat?: boolean;
  /** Enable debug logging for this hook instance */
  debug?: boolean;
}

export interface UseCommentsFromDBResult {
  comments: Comment[];
  totalCount: number;
  isLoading: boolean;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  page: number;
  /** Error state if the last operation failed */
  error: Error | null;
  /** Clear any error state */
  clearError: () => void;
  /** Clear comments immediately (for instant UI updates) */
  clearComments: () => void;
}

/** Performance metrics for debugging */
interface PerformanceMetrics {
  lastFetchDuration: number;
  lastCountDuration: number;
  totalFetches: number;
  failedFetches: number;
}

/**
 * Custom hook for loading comments from IndexedDB with reactive count updates.
 * Uses useLiveQuery from dexie-react-hooks for reactive total count.
 *
 * This hook is the bridge between IndexedDB (source of truth) and the UI.
 * Redux is only used for temporary view state caching.
 *
 * @example
 * ```tsx
 * const { comments, totalCount, isLoading, loadMore, error } = useCommentsFromDB({
 *   videoId: 'abc123',
 *   filters: { sortBy: 'date', sortOrder: 'desc' },
 *   searchKeyword: '',
 * });
 * ```
 */
export const useCommentsFromDB = (options: UseCommentsFromDBOptions): UseCommentsFromDBResult => {
  const {
    videoId,
    filters,
    searchKeyword,
    pageSize = PAGINATION.DEFAULT_PAGE_SIZE,
    topLevelOnly = true,
    excludeLiveChat = true,
    debug = false,
  } = options;

  // Component instance ID for logging
  const instanceId = useRef(`hook-${Math.random().toString(36).substr(2, 6)}`);
  const logPrefix = `[useCommentsFromDB:${instanceId.current}]`;

  const [comments, setComments] = useState<Comment[]>([]);
  const [page, setPage] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isLoadingRef = useRef(isLoading);
  const loadingMoreRef = useRef(loadingMore);

  const globalLoading = useSelector(selectIsLoading);

  useEffect(() => {
    isLoadingRef.current = isLoading;
  }, [isLoading]);

  useEffect(() => {
    loadingMoreRef.current = loadingMore;
  }, [loadingMore]);

  const metricsRef = useRef<PerformanceMetrics>({
    lastFetchDuration: 0,
    lastCountDuration: 0,
    totalFetches: 0,
    failedFetches: 0,
  });

  // Clear error state
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Clear comments immediately (for instant UI feedback)
  const clearComments = useCallback(() => {
    setComments([]);
    setPage(0);
  }, []);

  // Clear comments immediately when global loading starts (don't wait for DB event)
  // This prevents stale comments from showing during navigation
  const prevGlobalLoadingRef = useRef(globalLoading);
  useEffect(() => {
    // Detect when globalLoading transitions from false to true
    if (!prevGlobalLoadingRef.current && globalLoading && comments.length > 0) {
      clearComments();
    }
    prevGlobalLoadingRef.current = globalLoading;
  }, [globalLoading, comments.length, clearComments]);

  // Memoize sort values from filters
  const sortBy = useMemo(() => filters.sortBy || 'date', [filters.sortBy]);
  const sortOrder = useMemo(() => filters.sortOrder || 'desc', [filters.sortOrder]);

  // Memoize filter options for pagination queries
  const paginationOptions = useMemo(
    () => ({
      topLevelOnly,
      excludeLiveChat,
    }),
    [topLevelOnly, excludeLiveChat]
  );

  // Reactive total count using useLiveQuery
  // This will automatically re-run when the database changes
  const totalCount = useLiveQuery(
    async () => {
      if (!videoId) {
        return 0;
      }

      const startTime = performance.now();

      try {
        const count = await countComments(
          db.comments,
          videoId,
          filters,
          searchKeyword,
          paginationOptions
        );

        metricsRef.current.lastCountDuration = performance.now() - startTime;
        return count;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        logger.error(`${logPrefix} Count query failed:`, error);
        setError(error);
        return 0;
      }
    },
    [videoId, filters, searchKeyword, paginationOptions],
    0 // Default value
  );

  // Calculate hasMore based on loaded comments vs total count
  const hasMore = useMemo(() => {
    return totalCount > comments.length;
  }, [totalCount, comments.length]);

  // Track comments length in ref for logging without breaking memoization
  const commentsLengthRef = useRef(0);
  useEffect(() => {
    commentsLengthRef.current = comments.length;
  }, [comments.length]);

  // Fetch a specific page of comments
  const fetchPage = useCallback(
    async (pageNum: number, append: boolean = false): Promise<Comment[]> => {
      if (!videoId) {
        return [];
      }

      const startTime = performance.now();
      metricsRef.current.totalFetches++;

      try {
        const data = await loadPagedComments(
          db.comments,
          videoId,
          pageNum,
          pageSize,
          sortBy,
          sortOrder,
          filters,
          searchKeyword,
          paginationOptions
        );

        const duration = performance.now() - startTime;
        metricsRef.current.lastFetchDuration = duration;

        if (append) {
          setComments((prev) => [...prev, ...data]);
        } else {
          setComments(data);
        }

        setError((prev) => (prev ? null : prev));
        return data;
      } catch (err) {
        const fetchError = err instanceof Error ? err : new Error(String(err));
        metricsRef.current.failedFetches++;
        logger.error(`${logPrefix} Page fetch failed:`, fetchError);
        setError(fetchError);
        return [];
      }
    },
    [videoId, pageSize, sortBy, sortOrder, filters, searchKeyword, paginationOptions, logPrefix]
  );

  // Initial load and refresh when dependencies change
  useEffect(() => {
    if (!videoId) {
      setComments([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    // Cancel any pending requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setComments([]); // Clear comments immediately to show loader
    setIsLoading(true);
    setPage(0);
    setError(null);

    fetchPage(0, false)
      .catch((err) => {
        logger.error(`${logPrefix} Initial load failed:`, err);
      })
      .finally(() => {
        setIsLoading(false);
      });

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [videoId, sortBy, sortOrder, filters, searchKeyword, fetchPage, logPrefix]);

  // Subscribe to database events for this video with throttled updates
  useEffect(() => {
    if (!videoId) return;

    // Track pending refresh to coalesce multiple events
    let pendingRefresh = false;

    // Create a throttled refresh function to limit UI updates during heavy fetching
    const throttledRefresh = throttle(
      () => {
        if (pendingRefresh) {
          pendingRefresh = false;
          fetchPage(0, false).then((data) => {
            if (data.length > 0) {
              setIsLoading(false);
            }
          });
        }
      },
      UI_UPDATE_THROTTLE_MS,
      { leading: true, trailing: true }
    );

    const unsubscribe = dbEvents.onAll((event) => {
      if (event.videoId === videoId) {
        // Handle comments deleted - clear local state immediately
        if (event.type === 'comments:deleted') {
          setComments([]);
          setPage(0);
          return;
        }

        // Refresh data when new content arrives
        if (
          event.type === 'comments:added' ||
          event.type === 'comments:bulk-add' ||
          event.type === 'replies:added'
        ) {
          // Only refresh if we are on the first page or if the list is empty
          // AND we are not currently loading (to avoid race conditions/resets)
          if (
            (page === 0 || comments.length === 0) &&
            !isLoadingRef.current &&
            !loadingMoreRef.current
          ) {
            pendingRefresh = true;
            throttledRefresh();
          }
        }
      }
    });

    return () => {
      throttledRefresh.cancel();
      unsubscribe();
    };
  }, [videoId, page, comments.length, fetchPage]);

  // Load more comments (next page)
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || !videoId) {
      return;
    }

    const nextPage = page + 1;
    setLoadingMore(true);

    const failuresBefore = metricsRef.current.failedFetches;
    try {
      const data = await fetchPage(nextPage, true);
      if (data && data.length > 0) {
        setPage(nextPage);
      } else {
        // If no error occurred during fetch but result is empty,
        // the database returned 0 results despite hasMore being true.
        if (metricsRef.current.failedFetches === failuresBefore) {
          setError(
            new Error('Unable to load more comments. The database might be empty or out of sync.')
          );
        }
      }
    } catch (err) {
      logger.error(`${logPrefix} loadMore failed:`, err);
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, videoId, page, fetchPage, logPrefix]);

  // Manual refresh - reload from page 0
  const refresh = useCallback(async () => {
    if (!videoId) {
      return;
    }

    setComments([]); // Clear comments immediately
    setIsLoading(true);
    setPage(0);
    setError(null);

    try {
      await fetchPage(0, false);
    } catch (err) {
      logger.error(`${logPrefix} Refresh failed:`, err);
    } finally {
      setIsLoading(false);
    }
  }, [videoId, fetchPage, logPrefix]);

  // Log performance metrics periodically in debug mode
  useEffect(() => {
    if (!debug) return;

    const interval = setInterval(() => {
      const metrics = metricsRef.current;
      if (metrics.totalFetches > 0) {
        /* no-op */
      }
    }, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, [debug, logPrefix]);

  return {
    comments,
    totalCount: totalCount ?? 0,
    isLoading: isLoading || loadingMore,
    hasMore,
    loadMore,
    refresh,
    page,
    error,
    clearError,
    clearComments,
  };
};

/**
 * Hook for getting just the reactive comment count.
 * Useful for header/stats displays that need to show updating counts
 * without loading the actual comment data.
 *
 * @param videoId - The YouTube video ID
 * @param filters - Optional filter state
 * @param searchKeyword - Optional search keyword
 * @param options - Additional options for counting
 * @returns The current comment count (reactively updated)
 *
 * @example
 * ```tsx
 * const count = useLiveCommentCount('abc123');
 * // count will update automatically when comments are added/removed
 * ```
 */
export const useLiveCommentCount = (
  videoId: string | null,
  filters?: FilterState,
  searchKeyword?: string,
  options?: { topLevelOnly?: boolean; excludeLiveChat?: boolean }
): number => {
  return (
    useLiveQuery(
      async () => {
        if (!videoId) {
          return 0;
        }

        try {
          return await countComments(
            db.comments,
            videoId,
            filters ||
              {
                /* no-op */
              },
            searchKeyword || '',
            options ||
              {
                /* no-op */
              }
          );
        } catch (err) {
          logger.error('[useLiveCommentCount] Count query failed:', err);
          return 0;
        }
      },
      [videoId, filters, searchKeyword, options],
      0
    ) ?? 0
  );
};

/**
 * Hook to subscribe to database changes for a specific video.
 * Returns true when there are new comments available that aren't yet loaded.
 *
 * Useful for showing "new comments available" notifications.
 *
 * @param videoId - The YouTube video ID to watch
 * @param loadedCount - The current number of loaded comments
 * @returns true if there are more comments in the database than loaded
 *
 * @example
 * ```tsx
 * const hasNewComments = useNewCommentsAvailable('abc123', comments.length);
 * if (hasNewComments) {
 *   // Show "Load new comments" button
 * }
 * ```
 */
export const useNewCommentsAvailable = (videoId: string | null, loadedCount: number): boolean => {
  const totalCount = useLiveCommentCount(videoId);
  return totalCount > loadedCount;
};

/**
 * Hook to get the total number of comments for a video without any filters.
 * Useful for showing the unfiltered total in the UI.
 */
export const useTotalUnfilteredCount = (videoId: string | null): number => {
  return (
    useLiveQuery(
      async () => {
        if (!videoId) return 0;
        try {
          return await db.comments.where('videoId').equals(videoId).count();
        } catch (err) {
          logger.error('[useTotalUnfilteredCount] Error:', err);
          return 0;
        }
      },
      [videoId],
      0
    ) ?? 0
  );
};

export default useCommentsFromDB;
