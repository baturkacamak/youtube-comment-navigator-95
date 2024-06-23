import {useDispatch, useSelector} from 'react-redux';
import {useCallback, useEffect, useMemo, useState} from 'react';
import {RootState} from '../../../types/rootState';
import {setBookmarkedComments, setFilters, setShowBookmarked} from '../../../store/store';
import useComments from '../../comments/hooks/useComments';
import useSortedComments from '../../comments/hooks/useSortedComments';
import useFilteredComments from '../../comments/hooks/useFilteredComments';
import useSearchContent from './useSearchContent';
import {Filters} from '../../../types/filterTypes';
import {retrieveDataFromDB} from '../utils/cacheUtils';
import useTranscript from '../../transcripts/hooks/useTranscript';
import {calculateFilteredWordCount} from "../utils/calculateWordCount";

const useAppState = () => {
    const dispatch = useDispatch();
    const [activeTab, setActiveTab] = useState('comments');

    const comments = useSelector((state: RootState) => state.comments);
    const filters = useSelector((state: RootState) => state.filters);
    const isLoading = useSelector((state: RootState) => state.isLoading);
    const showBookmarked = useSelector((state: RootState) => state.showBookmarked);
    const bookmarkedComments = useSelector((state: RootState) => state.bookmarkedComments);
    const repliesCount = useSelector((state: RootState) => state.repliesCount);
    const transcripts = useSelector((state: RootState) => state.transcripts);
    const filteredTranscripts = useSelector((state: RootState) => state.filteredTranscripts);

    const { sortComments } = useSortedComments(false);
    const { filterComments } = useFilteredComments(false);
    const { handleSearch } = useSearchContent();
    const { initialLoadCompleted } = useComments();
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
        return filterComments(sortComments(commentsToUse, filters.sortBy, filters.sortOrder), filters);
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
        isLoading,
        repliesCount,
        transcripts,
        initialLoadCompleted,
        handleSearch,
        filteredAndSortedComments,
        setFiltersCallback,
        showBookmarked,
        toggleShowBookmarked,
        activeTab,
        setActiveTab,
        commentCount: comments.length,
        transcriptWordCount
    };
};

export default useAppState;
