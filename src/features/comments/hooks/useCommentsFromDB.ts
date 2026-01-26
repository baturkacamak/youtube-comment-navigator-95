// src/features/comments/hooks/useCommentsFromDB.ts
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../shared/utils/database/database';
import { Comment } from '../../../types/commentTypes';
import { FilterState } from '../../../types/filterTypes';
import { loadPagedComments, countComments } from '../services/pagination';
import { PAGINATION } from '../../shared/utils/appConstants';
import logger from '../../shared/utils/logger';

export interface UseCommentsFromDBOptions {
    videoId: string | null;
    filters: FilterState;
    searchKeyword: string;
    pageSize?: number;
    topLevelOnly?: boolean;
    excludeLiveChat?: boolean;
}

export interface UseCommentsFromDBResult {
    comments: Comment[];
    totalCount: number;
    isLoading: boolean;
    hasMore: boolean;
    loadMore: () => Promise<void>;
    refresh: () => Promise<void>;
    page: number;
}

/**
 * Custom hook for loading comments from IndexedDB with reactive count updates.
 * Uses useLiveQuery from dexie-react-hooks for reactive total count.
 *
 * This hook is the bridge between IndexedDB (source of truth) and the UI.
 * Redux is only used for temporary view state caching.
 */
export const useCommentsFromDB = (options: UseCommentsFromDBOptions): UseCommentsFromDBResult => {
    const {
        videoId,
        filters,
        searchKeyword,
        pageSize = PAGINATION.DEFAULT_PAGE_SIZE,
        topLevelOnly = true,
        excludeLiveChat = true,
    } = options;

    const [comments, setComments] = useState<Comment[]>([]);
    const [page, setPage] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const abortControllerRef = useRef<AbortController | null>(null);

    // Memoize sort values from filters
    const sortBy = useMemo(() => filters.sortBy || 'date', [filters.sortBy]);
    const sortOrder = useMemo(() => filters.sortOrder || 'desc', [filters.sortOrder]);

    // Memoize filter options for pagination queries
    const paginationOptions = useMemo(() => ({
        topLevelOnly,
        excludeLiveChat,
    }), [topLevelOnly, excludeLiveChat]);

    // Reactive total count using useLiveQuery
    // This will automatically re-run when the database changes
    const totalCount = useLiveQuery(
        async () => {
            if (!videoId) return 0;
            try {
                return await countComments(
                    db.comments,
                    videoId,
                    filters,
                    searchKeyword,
                    paginationOptions
                );
            } catch (error) {
                logger.error('[useCommentsFromDB] Error counting comments:', error);
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

    // Fetch a specific page of comments
    const fetchPage = useCallback(async (pageNum: number, append: boolean = false) => {
        if (!videoId) return;

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

            if (append) {
                setComments(prev => [...prev, ...data]);
            } else {
                setComments(data);
            }

            return data;
        } catch (error) {
            logger.error('[useCommentsFromDB] Error fetching page:', error);
            return [];
        }
    }, [videoId, pageSize, sortBy, sortOrder, filters, searchKeyword, paginationOptions]);

    // Initial load and refresh when dependencies change
    useEffect(() => {
        if (!videoId) {
            setComments([]);
            setIsLoading(false);
            return;
        }

        // Cancel any pending requests
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();

        setIsLoading(true);
        setPage(0);

        fetchPage(0, false)
            .finally(() => setIsLoading(false));

        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, [videoId, sortBy, sortOrder, filters, searchKeyword, fetchPage]);

    // Load more comments (next page)
    const loadMore = useCallback(async () => {
        if (loadingMore || !hasMore || !videoId) return;

        setLoadingMore(true);
        const nextPage = page + 1;

        try {
            const data = await fetchPage(nextPage, true);
            if (data && data.length > 0) {
                setPage(nextPage);
            }
        } finally {
            setLoadingMore(false);
        }
    }, [loadingMore, hasMore, videoId, page, fetchPage]);

    // Manual refresh - reload from page 0
    const refresh = useCallback(async () => {
        if (!videoId) return;

        setIsLoading(true);
        setPage(0);

        try {
            await fetchPage(0, false);
        } finally {
            setIsLoading(false);
        }
    }, [videoId, fetchPage]);

    return {
        comments,
        totalCount: totalCount ?? 0,
        isLoading: isLoading || loadingMore,
        hasMore,
        loadMore,
        refresh,
        page,
    };
};

/**
 * Hook for getting just the reactive comment count.
 * Useful for header/stats displays that need to show updating counts
 * without loading the actual comment data.
 */
export const useLiveCommentCount = (
    videoId: string | null,
    filters?: FilterState,
    searchKeyword?: string,
    options?: { topLevelOnly?: boolean; excludeLiveChat?: boolean }
): number => {
    return useLiveQuery(
        async () => {
            if (!videoId) return 0;
            try {
                return await countComments(
                    db.comments,
                    videoId,
                    filters || {},
                    searchKeyword || '',
                    options || {}
                );
            } catch (error) {
                logger.error('[useLiveCommentCount] Error:', error);
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
 */
export const useNewCommentsAvailable = (
    videoId: string | null,
    loadedCount: number
): boolean => {
    const totalCount = useLiveCommentCount(videoId);
    return totalCount > loadedCount;
};

export default useCommentsFromDB;
