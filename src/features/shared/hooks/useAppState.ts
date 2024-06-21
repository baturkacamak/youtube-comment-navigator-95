import { useDispatch, useSelector } from 'react-redux';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { RootState } from '../../../types/rootState';
import { setFilters, setShowBookmarked, setBookmarkedComments } from '../../../store/store';
import useComments from '../../comments/hooks/useComments';
import useSortedComments from '../../comments/hooks/useSortedComments';
import useFilteredComments from '../../comments/hooks/useFilteredComments';
import useSearchComments from '../../comments/hooks/useSearchComments';
import { Filters } from '../../../types/filterTypes';
import { retrieveDataFromDB } from '../utils/cacheUtils';

const useAppState = () => {
    const dispatch = useDispatch();
    const [activeTab, setActiveTab] = useState('comments'); // New state for active tab

    // Using individual useSelector calls to avoid unnecessary re-renders
    const comments = useSelector((state: RootState) => state.comments);
    const filters = useSelector((state: RootState) => state.filters);
    const isLoading = useSelector((state: RootState) => state.isLoading);
    const showBookmarked = useSelector((state: RootState) => state.showBookmarked);
    const bookmarkedComments = useSelector((state: RootState) => state.bookmarkedComments);
    const repliesCount = useSelector((state: RootState) => state.repliesCount);
    const transcriptsCount = useSelector((state: RootState) => state.transcriptsCount);

    const { sortComments } = useSortedComments(false);
    const { filterComments } = useFilteredComments(false);
    const { handleSearch } = useSearchComments();
    const { initialLoadCompleted } = useComments();

    const fetchBookmarkedComments = useCallback(async () => {
        const bookmarks = await retrieveDataFromDB('bookmarks');
        dispatch(setBookmarkedComments(bookmarks.data || []));
    }, [dispatch]);

    useEffect(() => {
        fetchBookmarkedComments();
    }, [fetchBookmarkedComments]);

    useEffect(() => {
        if (activeTab === 'bookmarks') {
            fetchBookmarkedComments();
        }
    }, [activeTab, fetchBookmarkedComments]);

    const filteredAndSortedComments = useMemo(() => {
        const commentsToUse = activeTab === 'bookmarks' ? bookmarkedComments : comments;
        return filterComments(sortComments(commentsToUse, filters.sortBy, filters.sortOrder), filters);
    }, [filters, sortComments, filterComments, comments, activeTab, bookmarkedComments]);

    const setFiltersCallback = useCallback((filters: Filters) => {
        dispatch(setFilters(filters));
    }, [dispatch]);

    const toggleShowBookmarked = useCallback(() => {
        dispatch(setShowBookmarked(!showBookmarked));
    }, [dispatch, showBookmarked]);

    return {
        comments,
        filters,
        isLoading,
        repliesCount,
        transcriptsCount,
        initialLoadCompleted,
        handleSearch,
        filteredAndSortedComments,
        setFiltersCallback,
        showBookmarked,
        toggleShowBookmarked,
        activeTab, // Return the active tab
        setActiveTab,
        commentCount: comments.length
    };
};

export default useAppState;
