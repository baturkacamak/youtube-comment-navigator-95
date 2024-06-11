// src/hooks/useAppState.ts
import { useDispatch, useSelector } from 'react-redux';
import { useCallback, useMemo } from 'react';
import { RootState } from '../types/rootState';
import { setFilters } from '../store/store';
import useComments from './useComments';
import useSortedComments from './useSortedComments';
import useFilteredComments from './useFilteredComments';
import useSearchComments from './useSearchComments';
import useLoadComments from './useLoadComments';
import { Filters } from '../types/filterTypes';

const useAppState = () => {
    const dispatch = useDispatch();

    // Using individual useSelector calls to avoid unnecessary re-renders
    const comments = useSelector((state: RootState) => state.comments);
    const originalComments = useSelector((state: RootState) => state.originalComments);
    const filters = useSelector((state: RootState) => state.filters);
    const isLoading = useSelector((state: RootState) => state.isLoading);
    const commentsCount = useSelector((state: RootState) => state.commentsCount);
    const repliesCount = useSelector((state: RootState) => state.repliesCount);
    const transcriptsCount = useSelector((state: RootState) => state.transcriptsCount);

    const { sortComments } = useSortedComments(false);
    const { filterComments } = useFilteredComments(false);
    const { handleSearch } = useSearchComments();
    const { loadComments, loadChatReplies, loadTranscript, loadAll } = useLoadComments();

    const { initialLoadCompleted } = useComments();

    const filteredAndSortedComments = useMemo(() => {
        return filterComments(sortComments(comments, filters.sortBy, filters.sortOrder), filters);
    }, [filters, sortComments, filterComments]);

    const setFiltersCallback = useCallback((filters: Filters) => {
        dispatch(setFilters(filters));
    }, [dispatch]);

    return {
        comments,
        filters,
        isLoading,
        commentsCount,
        repliesCount,
        transcriptsCount,
        initialLoadCompleted,
        handleSearch,
        loadComments,
        loadChatReplies,
        loadTranscript,
        loadAll,
        filteredAndSortedComments,
        setFiltersCallback
    };
};

export default useAppState;
