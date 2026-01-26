import { useDispatch, useSelector } from 'react-redux';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { RootState } from '../../../types/rootState';
import {setBookmarkedComments, setFilters, setShowBookmarked, setTotalCommentsCount} from '../../../store/store';
import useCommentsIncrementalLoader from '../../comments/hooks/useCommentsIncrementalLoader';
import useFilteredComments from '../../comments/hooks/useFilteredComments';
import { Filters } from '../../../types/filterTypes';
import useTranscript from '../../transcripts/hooks/useTranscript';
import { calculateFilteredWordCount } from "../utils/calculateWordCount";
import useSortedComments from "../../comments/hooks/sorting/useSortedComments";
import { db } from "../utils/database/database";
import { Comment } from "../../../types/commentTypes";
import { searchComments } from "../../comments/services/commentSearchService";
import { searchTranscripts } from "../../comments/services/transcriptSearchService";
import useFetchDataOnUrlChange from "../hooks/urlChange/useFetchDataOnUrlChange";
import logger from '../utils/logger';

const useAppState = () => {
    const dispatch = useDispatch();
    const [activeTab, setActiveTab] = useState('comments');
    const [bookmarkedOnlyComments, setBookmarkedOnlyComments] = useState<Comment[]>([]);

    // Redux is now a "View Buffer" - comments filtering/sorting is handled at the DB level
    // We only keep filters, search keyword, and UI state in Redux
    const filters = useSelector((state: RootState) => state.filters);
    const showBookmarked = useSelector((state: RootState) => state.showBookmarked);
    const bookmarkedComments = useSelector((state: RootState) => state.bookmarkedComments);
    const transcripts = useSelector((state: RootState) => state.transcripts);
    const filteredTranscripts = useSelector((state: RootState) => state.filteredTranscripts);
    const searchKeyword = useSelector((state: RootState) => state.searchKeyword);
    const totalCommentsCount = useSelector((state: RootState) => state.totalCommentsCount);

    // Sorting/filtering hooks are still used for bookmarks (which may span multiple videos)
    const { sortComments } = useSortedComments(false);
    const { filterComments } = useFilteredComments();
    const { initialLoadCompleted } = useCommentsIncrementalLoader();
    const { loadTranscript } = useTranscript();

    const fetchBookmarkedComments = useCallback(async () => {
        const bookmarks = await db.comments.where('bookmarkAddedDate').above('').toArray();
        if (bookmarks) {
            dispatch(setBookmarkedComments(bookmarks));
            setBookmarkedOnlyComments(bookmarks); // Update local state
        }
    }, [dispatch]);

    useEffect(() => {
        fetchBookmarkedComments();
    }, [fetchBookmarkedComments]);

    useEffect(() => {
        if (activeTab === 'bookmarks') {
            if (searchKeyword.trim() === '') {
                fetchBookmarkedComments();
            }
            dispatch(setShowBookmarked(true));
        } else {
            dispatch(setShowBookmarked(false));
        }
    }, [activeTab, fetchBookmarkedComments, searchKeyword]);

    const filteredAndSortedBookmarks = useMemo(() => {
        if (!filters) return [];
        let returnComments = bookmarkedOnlyComments;
        if (searchKeyword) {
            returnComments = searchComments(returnComments, searchKeyword);
        }
        returnComments = sortComments(returnComments, filters.sortBy, filters.sortOrder);
        returnComments = filterComments(returnComments, filters);
        return returnComments;
    }, [filters, sortComments, filterComments, bookmarkedOnlyComments, searchKeyword]);

    // NOTE: In-memory comment filtering/sorting has been moved to the IndexedDB layer.
    // CommentList now uses useCommentsFromDB hook which queries the database directly.
    // This empty array is kept for backward compatibility with components that may still reference it.
    // Bookmarks still use in-memory filtering above since they span multiple videos.
    const filteredAndSortedComments: Comment[] = [];

    const searchedTranscripts = useMemo(() => {
        let filteredTranscripts = transcripts;
        if (searchKeyword) {
            filteredTranscripts = searchTranscripts(filteredTranscripts, searchKeyword);
        }
        return filteredTranscripts;
    }, [searchKeyword, transcripts]);

    const setFiltersCallback = useCallback((filters: Filters) => {
        dispatch(setFilters(filters));
    }, [dispatch]);

    const toggleShowBookmarked = useCallback(() => {
        dispatch(setShowBookmarked(!showBookmarked));
    }, [dispatch, showBookmarked]);

    const fetchTotalCommentsCount = useCallback(async () => {
        try {
            // Get current video ID from URL or wherever you store it
            const currentVideoId = window.location.href.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\?]*)/)?.[1] || '';

            if (currentVideoId) {
                // Count comments for this video
                const count = await db.comments
                    .where('videoId')
                    .equals(currentVideoId)
                    .count();

                dispatch(setTotalCommentsCount(count));
            }
        } catch (error) {
            logger.error('Error fetching total comments count:', error);
        }
    }, [dispatch]);

    useEffect(() => {
        fetchTotalCommentsCount();
    }, [fetchTotalCommentsCount]);

    const transcriptWordCount = calculateFilteredWordCount(searchedTranscripts, searchKeyword);

    // Call useFetchDataOnUrlChange
    useFetchDataOnUrlChange();

    return {
        // Note: 'comments' is no longer returned as it's now managed by useCommentsFromDB hook
        // Components should use the hook directly for reactive comment data
        filters,
        transcripts,
        initialLoadCompleted,
        filteredAndSortedComments, // Now an empty array - use useCommentsFromDB instead
        setFiltersCallback,
        showBookmarked,
        toggleShowBookmarked,
        activeTab,
        setActiveTab,
        transcriptWordCount,
        filteredAndSortedBookmarks,
        transcript: searchedTranscripts,
        totalCommentsCount,
        fetchTotalCommentsCount,
        bookmarkedOnlyComments
    };
};

export default useAppState;
