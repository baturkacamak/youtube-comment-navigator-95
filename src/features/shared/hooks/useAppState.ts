import { useDispatch, useSelector } from 'react-redux';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { RootState } from '../../../types/rootState';
import { setBookmarkedComments, setFilters, setShowBookmarked } from '../../../store/store';
import useCommentsIncrementalLoader from '../../comments/hooks/useCommentsIncrementalLoader';
import useFilteredComments from '../../comments/hooks/useFilteredComments';
import useSearchContent from './useSearchContent';
import { Filters } from '../../../types/filterTypes';
import { retrieveDataFromDB } from '../utils/cacheUtils';
import useTranscript from '../../transcripts/hooks/useTranscript';
import { calculateFilteredWordCount } from "../utils/calculateWordCount";
import useSortedComments from "../../comments/hooks/sorting/useSortedComments";

const useAppState = () => {
    const dispatch = useDispatch();
    const [activeTab, setActiveTab] = useState('comments');

    const comments = useSelector((state: RootState) => state.comments);
    const filters = useSelector((state: RootState) => state.filters);
    const showBookmarked = useSelector((state: RootState) => state.showBookmarked);
    const bookmarkedComments = useSelector((state: RootState) => state.bookmarkedComments);
    const transcripts = useSelector((state: RootState) => state.transcripts);
    const filteredTranscripts = useSelector((state: RootState) => state.filteredTranscripts);

    const { sortComments } = useSortedComments(false);
    const { filterComments } = useFilteredComments(false);
    const { handleSearch } = useSearchContent();
    const { initialLoadCompleted } = useCommentsIncrementalLoader();
    const { loadTranscript } = useTranscript();

    const fetchBookmarkedComments = useCallback(async () => {
        const bookmarks = await retrieveDataFromDB('bookmarks');
        if (bookmarks) {
            dispatch(setBookmarkedComments(bookmarks?.data || []));
        }
    }, [dispatch]);

    useEffect(() => {
        fetchBookmarkedComments();
    }, [fetchBookmarkedComments]);

    useEffect(() => {
        if (activeTab === 'bookmarks') {
            if (filters.keyword.trim() === '') {
                fetchBookmarkedComments();
            }
            dispatch(setShowBookmarked(true));
        } else {
            dispatch(setShowBookmarked(false));
        }
    }, [activeTab, fetchBookmarkedComments, filters.keyword]);

    const filteredAndSortedComments = useMemo(() => {
        if (!filters) return [];
        const commentsToUse = activeTab === 'bookmarks' ? bookmarkedComments : comments;
        return filterComments(
            sortComments(commentsToUse, filters.sortBy, filters.sortOrder),
            filters
        );
    }, [filters, sortComments, filterComments, comments, activeTab, bookmarkedComments]);

    const setFiltersCallback = useCallback((filters: Filters) => {
        dispatch(setFilters(filters));
    }, [dispatch]);

    const toggleShowBookmarked = useCallback(() => {
        dispatch(setShowBookmarked(!showBookmarked));
    }, [dispatch, showBookmarked]);

    const transcriptWordCount = calculateFilteredWordCount(filteredTranscripts, filters.keyword);

    return {
        comments,
        filters,
        transcripts,
        initialLoadCompleted,
        handleSearch,
        filteredAndSortedComments,
        setFiltersCallback,
        showBookmarked,
        toggleShowBookmarked,
        activeTab,
        setActiveTab,
        transcriptWordCount
    };
};

export default useAppState;
