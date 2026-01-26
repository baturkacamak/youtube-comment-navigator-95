// src/features/comments/hooks/useCommentsFromDB.ts
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../shared/utils/database/database';
import { Comment } from '../../../types/commentTypes';
import { FilterState } from '../../../types/filterTypes';
import { loadPagedComments, countComments } from '../services/pagination';
import { PAGINATION } from '../../shared/utils/appConstants';
import logger from '../../shared/utils/logger';
import { dbEvents } from '../../shared/utils/database/dbEvents';
import { throttle } from '../../shared/utils/debounce';

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
    const metricsRef = useRef<PerformanceMetrics>({
        lastFetchDuration: 0,
        lastCountDuration: 0,
        totalFetches: 0,
        failedFetches: 0,
    });

    // Clear error state
    const clearError = useCallback(() => {
        setError(null);
        logger.debug(`${logPrefix} Error state cleared`);
    }, [logPrefix]);

    // Debug logger helper
    const debugLog = useCallback((message: string, ...args: any[]) => {
        if (debug) {
            logger.debug(`${logPrefix} ${message}`, ...args);
        }
    }, [debug, logPrefix]);

    // Memoize sort values from filters
    const sortBy = useMemo(() => {
        const value = filters.sortBy || 'date';
        debugLog(`Sort by computed: ${value}`);
        return value;
    }, [filters.sortBy, debugLog]);

    const sortOrder = useMemo(() => {
        const value = filters.sortOrder || 'desc';
        debugLog(`Sort order computed: ${value}`);
        return value;
    }, [filters.sortOrder, debugLog]);

    // Memoize filter options for pagination queries
    const paginationOptions = useMemo(() => ({
        topLevelOnly,
        excludeLiveChat,
    }), [topLevelOnly, excludeLiveChat]);

    // Log when options change
    useEffect(() => {
        logger.info(`${logPrefix} Hook initialized/updated`, {
            videoId: videoId || '(none)',
            sortBy,
            sortOrder,
            searchKeyword: searchKeyword || '(none)',
            pageSize,
            topLevelOnly,
            excludeLiveChat,
        });
    }, [videoId, sortBy, sortOrder, searchKeyword, pageSize, topLevelOnly, excludeLiveChat, logPrefix]);

    // Reactive total count using useLiveQuery
    // This will automatically re-run when the database changes
    const totalCount = useLiveQuery(
        async () => {
            if (!videoId) {
                debugLog('Skipping count query - no videoId');
                return 0;
            }

            const startTime = performance.now();
            debugLog(`Starting count query for video: ${videoId}`);

            try {
                const count = await countComments(
                    db.comments,
                    videoId,
                    filters,
                    searchKeyword,
                    paginationOptions
                );

                const duration = performance.now() - startTime;
                metricsRef.current.lastCountDuration = duration;

                logger.debug(`${logPrefix} Count query completed`, {
                    videoId,
                    count,
                    duration: `${duration.toFixed(2)}ms`,
                    hasFilters: Object.values(filters).some(v => v && v !== 'date' && v !== 'desc'),
                    hasSearch: !!searchKeyword,
                });

                return count;
            } catch (err) {
                const error = err instanceof Error ? err : new Error(String(err));
                logger.error(`${logPrefix} Count query failed`, {
                    videoId,
                    error: error.message,
                    stack: error.stack,
                });
                setError(error);
                return 0;
            }
        },
        [videoId, filters, searchKeyword, paginationOptions],
        0 // Default value
    );

    // Calculate hasMore based on loaded comments vs total count
    const hasMore = useMemo(() => {
        const result = totalCount > comments.length;
        debugLog(`hasMore calculated: ${result} (total: ${totalCount}, loaded: ${comments.length})`);
        return result;
    }, [totalCount, comments.length, debugLog]);

    // Fetch a specific page of comments
    const fetchPage = useCallback(async (pageNum: number, append: boolean = false): Promise<Comment[]> => {
        if (!videoId) {
            logger.warn(`${logPrefix} fetchPage called without videoId`);
            return [];
        }

        const startTime = performance.now();
        const fetchId = `fetch-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;

        logger.info(`${logPrefix} Fetching page ${pageNum}`, {
            fetchId,
            videoId,
            pageNum,
            pageSize,
            sortBy,
            sortOrder,
            append,
            currentCommentsCount: comments.length,
        });

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

            if (data.length === 0 && pageNum === 0) {
                logger.warn(`${logPrefix} No comments found for video`, {
                    fetchId,
                    videoId,
                    filters: JSON.stringify(filters),
                    searchKeyword,
                });
            } else {
                logger.success(`${logPrefix} Page fetch completed`, {
                    fetchId,
                    videoId,
                    pageNum,
                    commentsReturned: data.length,
                    duration: `${duration.toFixed(2)}ms`,
                    append,
                });
            }

            if (append) {
                setComments(prev => {
                    const newComments = [...prev, ...data];
                    debugLog(`Appended ${data.length} comments, new total: ${newComments.length}`);
                    return newComments;
                });
            } else {
                setComments(data);
                debugLog(`Set ${data.length} comments (replaced previous)`);
            }

            // Clear any previous error on successful fetch
            if (error) {
                setError(null);
            }

            return data;
        } catch (err) {
            const fetchError = err instanceof Error ? err : new Error(String(err));
            metricsRef.current.failedFetches++;

            logger.error(`${logPrefix} Page fetch failed`, {
                fetchId,
                videoId,
                pageNum,
                error: fetchError.message,
                stack: fetchError.stack,
                totalFailedFetches: metricsRef.current.failedFetches,
            });

            setError(fetchError);
            return [];
        }
    }, [videoId, pageSize, sortBy, sortOrder, filters, searchKeyword, paginationOptions, comments.length, error, logPrefix, debugLog]);

    // Initial load and refresh when dependencies change
    useEffect(() => {
        if (!videoId) {
            debugLog('No videoId - clearing comments');
            setComments([]);
            setIsLoading(false);
            setError(null);
            return;
        }

        // Cancel any pending requests
        if (abortControllerRef.current) {
            debugLog('Aborting previous request');
            abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();

        logger.info(`${logPrefix} Dependencies changed - reloading`, {
            videoId,
            sortBy,
            sortOrder,
            searchKeyword: searchKeyword || '(none)',
            filterCount: Object.values(filters).filter(Boolean).length,
        });

        setIsLoading(true);
        setPage(0);
        setError(null);

        fetchPage(0, false)
            .then(data => {
                logger.debug(`${logPrefix} Initial load completed with ${data.length} comments`);
            })
            .catch(err => {
                logger.error(`${logPrefix} Initial load failed:`, err);
            })
            .finally(() => {
                setIsLoading(false);
            });

        return () => {
            if (abortControllerRef.current) {
                debugLog('Cleanup: aborting pending request');
                abortControllerRef.current.abort();
            }
        };
    }, [videoId, sortBy, sortOrder, filters, searchKeyword, fetchPage, logPrefix, debugLog]);

    // Subscribe to database events for this video with throttled updates
    useEffect(() => {
        if (!videoId) return;

        debugLog(`Subscribing to database events for video: ${videoId}`);

        // Track pending refresh to coalesce multiple events
        let pendingRefresh = false;

        // Create a throttled refresh function to limit UI updates during heavy fetching
        // This ensures we update at most once per UI_UPDATE_THROTTLE_MS
        const throttledRefresh = throttle(() => {
            if (pendingRefresh) {
                pendingRefresh = false;
                logger.info(`${logPrefix} Throttled data update, refreshing view`);
                fetchPage(0, false).then(data => {
                    if (data.length > 0) {
                        setIsLoading(false);
                    }
                });
            }
        }, UI_UPDATE_THROTTLE_MS, { leading: true, trailing: true });

        const unsubscribe = dbEvents.onAll((event) => {
            if (event.videoId === videoId) {
                debugLog(`Database event received: ${event.type}`, {
                    count: event.count,
                    commentIds: event.commentIds?.length,
                });

                // Refresh data when new content arrives
                if (
                    event.type === 'comments:added' ||
                    event.type === 'comments:bulk-add' ||
                    event.type === 'replies:added'
                ) {
                    // Only refresh if we are on the first page or if the list is empty
                    // This prevents disrupting the user if they have scrolled down
                    if (page === 0 || comments.length === 0) {
                        pendingRefresh = true;
                        throttledRefresh();
                    }
                }
            }
        });

        return () => {
            debugLog('Unsubscribing from database events');
            throttledRefresh.cancel();
            unsubscribe();
        };
    }, [videoId, page, comments.length, fetchPage, debugLog, logPrefix]);

    // Load more comments (next page)
    const loadMore = useCallback(async () => {
        if (loadingMore) {
            logger.warn(`${logPrefix} loadMore called while already loading`);
            return;
        }

        if (!hasMore) {
            logger.debug(`${logPrefix} loadMore called but no more comments available`);
            return;
        }

        if (!videoId) {
            logger.warn(`${logPrefix} loadMore called without videoId`);
            return;
        }

        const nextPage = page + 1;
        logger.info(`${logPrefix} Loading more comments`, {
            currentPage: page,
            nextPage,
            currentCommentsCount: comments.length,
            totalCount,
        });

        setLoadingMore(true);

        try {
            const data = await fetchPage(nextPage, true);
            if (data && data.length > 0) {
                setPage(nextPage);
                logger.debug(`${logPrefix} Page incremented to ${nextPage}`);
            } else {
                logger.warn(`${logPrefix} loadMore returned no new comments`);
            }
        } catch (err) {
            logger.error(`${logPrefix} loadMore failed:`, err);
        } finally {
            setLoadingMore(false);
        }
    }, [loadingMore, hasMore, videoId, page, fetchPage, comments.length, totalCount, logPrefix]);

    // Manual refresh - reload from page 0
    const refresh = useCallback(async () => {
        if (!videoId) {
            logger.warn(`${logPrefix} refresh called without videoId`);
            return;
        }

        logger.info(`${logPrefix} Manual refresh triggered`, {
            videoId,
            previousCommentsCount: comments.length,
        });

        setIsLoading(true);
        setPage(0);
        setError(null);

        try {
            const data = await fetchPage(0, false);
            logger.success(`${logPrefix} Refresh completed with ${data.length} comments`);
        } catch (err) {
            logger.error(`${logPrefix} Refresh failed:`, err);
        } finally {
            setIsLoading(false);
        }
    }, [videoId, fetchPage, comments.length, logPrefix]);

    // Log performance metrics periodically in debug mode
    useEffect(() => {
        if (!debug) return;

        const interval = setInterval(() => {
            const metrics = metricsRef.current;
            if (metrics.totalFetches > 0) {
                logger.debug(`${logPrefix} Performance metrics`, {
                    lastFetchDuration: `${metrics.lastFetchDuration.toFixed(2)}ms`,
                    lastCountDuration: `${metrics.lastCountDuration.toFixed(2)}ms`,
                    totalFetches: metrics.totalFetches,
                    failedFetches: metrics.failedFetches,
                    successRate: `${((1 - metrics.failedFetches / metrics.totalFetches) * 100).toFixed(1)}%`,
                });
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
    const logPrefix = '[useLiveCommentCount]';

    return useLiveQuery(
        async () => {
            if (!videoId) {
                logger.debug(`${logPrefix} No videoId provided, returning 0`);
                return 0;
            }

            const startTime = performance.now();

            try {
                const count = await countComments(
                    db.comments,
                    videoId,
                    filters || {},
                    searchKeyword || '',
                    options || {}
                );

                const duration = performance.now() - startTime;
                logger.debug(`${logPrefix} Count query completed`, {
                    videoId,
                    count,
                    duration: `${duration.toFixed(2)}ms`,
                });

                return count;
            } catch (err) {
                const error = err instanceof Error ? err : new Error(String(err));
                logger.error(`${logPrefix} Count query failed`, {
                    videoId,
                    error: error.message,
                });
                return 0;
            }
        },
        [videoId, filters, searchKeyword, options],
        0
    ) ?? 0;
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
export const useNewCommentsAvailable = (
    videoId: string | null,
    loadedCount: number
): boolean => {
    const totalCount = useLiveCommentCount(videoId);
    const hasNew = totalCount > loadedCount;

    useEffect(() => {
        if (hasNew && videoId) {
            logger.debug('[useNewCommentsAvailable] New comments available', {
                videoId,
                totalCount,
                loadedCount,
                newCount: totalCount - loadedCount,
            });
        }
    }, [hasNew, videoId, totalCount, loadedCount]);

    return hasNew;
};

/**
 * Hook to get the total number of comments for a video without any filters.
 * Useful for showing the unfiltered total in the UI.
 */
export const useTotalUnfilteredCount = (videoId: string | null): number => {
    return useLiveQuery(
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
    ) ?? 0;
};

export default useCommentsFromDB;
