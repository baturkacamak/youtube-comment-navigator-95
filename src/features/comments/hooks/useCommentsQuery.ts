import { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../../types/rootState';
import { Comment, CommentQueryOptions } from '../../../types/commentTypes';
import { CommentService } from '../services/commentService';
import {
    setDisplayedComments,
    setTotalCommentCount,
    addDisplayedComments,
    setIsLoading
} from '../../../store/store';

interface UseCommentsQueryResult {
    comments: Comment[];
    isLoading: boolean;
    hasMore: boolean;
    totalCount: number;
    currentPage: number;
    loadMore: () => Promise<void>;
    refresh: () => Promise<void>;
}

const useCommentsQuery = (options?: CommentQueryOptions): UseCommentsQueryResult => {
    const dispatch = useDispatch();
    const displayedComments = useSelector((state: RootState) => state.displayedComments);
    const totalCommentCount = useSelector((state: RootState) => state.totalCommentCount);
    const isLoading = useSelector((state: RootState) => state.isLoading);

    const [currentPage, setCurrentPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);

    const queryOptions: CommentQueryOptions = {
        basicFilters: {},
        advancedFilters: {},
        sortOptions: { sortBy: 'date', sortOrder: 'desc' },
        searchTerm: '',
        page: 0,
        pageSize: 10,
        ...options
    };

    const fetchTotalCount = useCallback(async () => {
        const count = await CommentService.getTotalCommentCount();
        dispatch(setTotalCommentCount(count));
        return count;
    }, [dispatch]);

    const fetchInitialComments = useCallback(async () => {
        try {
            dispatch(setIsLoading(true));

            let comments: Comment[] = [];

            if (queryOptions.searchTerm) {
                comments = await CommentService.searchComments(
                    queryOptions.searchTerm,
                    queryOptions.page || 0,
                    queryOptions.pageSize || 10
                );
            } else if (Object.values(queryOptions.basicFilters || {}).some(val => val === true) ||
                Object.values(queryOptions.advancedFilters || {}).some(val => val !== undefined)) {
                comments = await CommentService.getFilteredAndSortedComments(
                    queryOptions.basicFilters || {},
                    queryOptions.advancedFilters || {},
                    queryOptions.sortOptions?.sortBy || 'date',
                    queryOptions.sortOptions?.sortOrder || 'desc',
                    queryOptions.page || 0,
                    queryOptions.pageSize || 10
                );
            } else if (queryOptions.sortOptions && queryOptions.sortOptions.sortBy) {
                comments = await CommentService.getSortedComments(
                    queryOptions.sortOptions.sortBy,
                    queryOptions.sortOptions.sortOrder,
                    queryOptions.page || 0,
                    queryOptions.pageSize || 10
                );
            } else {
                comments = await CommentService.getCommentsWithRepliesByPage(
                    queryOptions.page || 0,
                    queryOptions.pageSize || 10
                );
            }

            dispatch(setDisplayedComments(comments));

            const count = await fetchTotalCount();
            setHasMore(comments.length < count);

            setCurrentPage(queryOptions.page || 0);
        } catch (error) {
            console.error('Error fetching comments:', error);
        } finally {
            dispatch(setIsLoading(false));
        }
    }, [dispatch, fetchTotalCount, queryOptions]);

    useEffect(() => {
        fetchInitialComments();
    }, [fetchInitialComments]);

    // Daha fazla yorum yükle
    const loadMore = useCallback(async () => {
        if (!hasMore || isLoading) return;

        try {
            dispatch(setIsLoading(true));
            const nextPage = currentPage + 1;

            let nextComments: Comment[] = [];

            if (queryOptions.searchTerm) {
                nextComments = await CommentService.searchComments(
                    queryOptions.searchTerm,
                    nextPage,
                    queryOptions.pageSize || 10
                );
            } else if (Object.values(queryOptions.basicFilters || {}).some(val => val === true) ||
                Object.values(queryOptions.advancedFilters || {}).some(val => val !== undefined)) {
                nextComments = await CommentService.getFilteredAndSortedComments(
                    queryOptions.basicFilters || {},
                    queryOptions.advancedFilters || {},
                    queryOptions.sortOptions?.sortBy || 'date',
                    queryOptions.sortOptions?.sortOrder || 'desc',
                    nextPage,
                    queryOptions.pageSize || 10
                );
            } else if (queryOptions.sortOptions && queryOptions.sortOptions.sortBy) {
                nextComments = await CommentService.getSortedComments(
                    queryOptions.sortOptions.sortBy,
                    queryOptions.sortOptions.sortOrder,
                    nextPage,
                    queryOptions.pageSize || 10
                );
            } else {
                nextComments = await CommentService.getCommentsWithRepliesByPage(
                    nextPage,
                    queryOptions.pageSize || 10
                );
            }

            if (nextComments.length > 0) {
                dispatch(addDisplayedComments(nextComments));
                setCurrentPage(nextPage);

                const expectedTotal = (nextPage + 1) * (queryOptions.pageSize || 10);
                setHasMore(displayedComments.length + nextComments.length < totalCommentCount);
            } else {
                setHasMore(false);
            }
        } catch (error) {
            console.error('Error loading more comments:', error);
        } finally {
            dispatch(setIsLoading(false));
        }
    }, [currentPage, dispatch, displayedComments.length, hasMore, isLoading, queryOptions, totalCommentCount]);

    const refresh = useCallback(async () => {
        setCurrentPage(0);
        setHasMore(true);
        await fetchInitialComments();
    }, [fetchInitialComments]);

    return {
        comments: displayedComments,
        isLoading,
        hasMore,
        totalCount: totalCommentCount,
        currentPage,
        loadMore,
        refresh
    };
};

export default useCommentsQuery;