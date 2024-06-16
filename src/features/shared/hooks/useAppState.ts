import { useDispatch, useSelector } from 'react-redux';
import { useCallback, useMemo } from 'react';
import { RootState } from '../../../types/rootState';
import { setFilters, setShowBookmarked } from '../../../store/store';
import useComments from '../../comments/hooks/useComments';
import useSortedComments from '../../comments/hooks/useSortedComments';
import useFilteredComments from '../../comments/hooks/useFilteredComments';
import useSearchComments from '../../comments/hooks/useSearchComments';
import useLoadComments from '../../comments/hooks/useLoadComments';
import { Filters } from '../../../types/filterTypes';

const useAppState = () => {
    const dispatch = useDispatch();

    // Using individual useSelector calls to avoid unnecessary re-renders
    const comments = useSelector((state: RootState) => state.comments);
    const originalComments = useSelector((state: RootState) => state.originalComments);
    const filters = useSelector((state: RootState) => state.filters);
    const isLoading = useSelector((state: RootState) => state.isLoading);
    const showBookmarked = useSelector((state: RootState) => state.showBookmarked); // Add this line
    useSelector((state: RootState) => state.commentsCount);
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
        filteredAndSortedComments,
        setFiltersCallback,
        showBookmarked, // Add this line
        toggleShowBookmarked, // Add this line
    };
};

export default useAppState;
