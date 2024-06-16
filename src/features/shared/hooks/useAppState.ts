import { useDispatch, useSelector } from 'react-redux';
import { useCallback, useEffect, useMemo } from 'react';
import { RootState } from '../../../types/rootState';
import { setFilters, setShowBookmarked, setBookmarkedComments } from '../../../store/store';
import useComments from '../../comments/hooks/useComments';
import useSortedComments from '../../comments/hooks/useSortedComments';
import useFilteredComments from '../../comments/hooks/useFilteredComments';
import useSearchComments from '../../comments/hooks/useSearchComments';
import useLoadComments from '../../comments/hooks/useLoadComments';
import { Filters } from '../../../types/filterTypes';
import { retrieveDataFromDB } from '../../shared/utils/cacheUtils';
import { Comment } from '../../../types/commentTypes';

const useAppState = () => {
    const dispatch = useDispatch();

    // Using individual useSelector calls to avoid unnecessary re-renders
    const comments = useSelector((state: RootState) => state.comments);
    const originalComments = useSelector((state: RootState) => state.originalComments);
    const filters = useSelector((state: RootState) => state.filters);
    const isLoading = useSelector((state: RootState) => state.isLoading);
    const showBookmarked = useSelector((state: RootState) => state.showBookmarked);
    const bookmarkedComments = useSelector((state: RootState) => state.bookmarkedComments);
    useSelector((state: RootState) => state.commentsCount);
    const repliesCount = useSelector((state: RootState) => state.repliesCount);
    const transcriptsCount = useSelector((state: RootState) => state.transcriptsCount);

    const { sortComments } = useSortedComments(false);
    const { filterComments } = useFilteredComments(false);
    const { handleSearch } = useSearchComments();
    const { loadComments, loadChatReplies, loadTranscript, loadAll } = useLoadComments();

    const { initialLoadCompleted } = useComments();

    useEffect(() => {
        const fetchBookmarkedComments = async () => {
            const bookmarks = await retrieveDataFromDB('bookmarks');
            dispatch(setBookmarkedComments(bookmarks || []));
        };

        fetchBookmarkedComments(); // Fetch bookmarks on initial load

        if (showBookmarked) {
            fetchBookmarkedComments(); // Fetch bookmarks when showBookmarked is toggled
        }
    }, [showBookmarked, dispatch]);

    const filteredAndSortedComments = useMemo(() => {
        const commentsToUse = showBookmarked ? bookmarkedComments : comments;
        return filterComments(sortComments(commentsToUse, filters.sortBy, filters.sortOrder), filters);
    }, [filters, sortComments, filterComments, comments, showBookmarked, bookmarkedComments]);

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
        loadComments,
        loadChatReplies,
        loadTranscript,
        loadAll,
        filteredAndSortedComments, // Ensure this returns the right set of comments
        setFiltersCallback,
        showBookmarked,
        toggleShowBookmarked,
    };
};

export default useAppState;
