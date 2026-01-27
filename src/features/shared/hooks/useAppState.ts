import { useDispatch, useSelector } from 'react-redux';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {setBookmarkedComments, setFilters, setShowBookmarked} from '../../../store/store';
import {
    selectComments,
    selectFilters,
    selectShowBookmarked,
    selectTranscripts,
    selectSearchKeyword,
    selectTotalCommentsCount,
} from '../../../store/selectors';
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
import { useLiveCommentCount } from '../../comments/hooks/useCommentsFromDB';
import { extractYouTubeVideoIdFromUrl } from '../utils/extractYouTubeVideoIdFromUrl';

const useAppState = () => {
    const dispatch = useDispatch();
    const [activeTab, setActiveTab] = useState('comments');
    const [bookmarkedOnlyComments, setBookmarkedOnlyComments] = useState<Comment[]>([]);

    // Use memoized selectors to prevent unnecessary re-renders
    const comments = useSelector(selectComments);
    const filters = useSelector(selectFilters);
    const showBookmarked = useSelector(selectShowBookmarked);
    const transcripts = useSelector(selectTranscripts);
    const searchKeyword = useSelector(selectSearchKeyword);
    const totalCommentsCount = useSelector(selectTotalCommentsCount);

    const { sortComments } = useSortedComments(false);
    const { filterComments } = useFilteredComments();
    const { initialLoadCompleted } = useCommentsIncrementalLoader();
    const { loadTranscript } = useTranscript();

    const videoId = extractYouTubeVideoIdFromUrl();

    // Use reactive hook to get the count of comments matching current filters/search
    const liveFilteredCommentCount = useLiveCommentCount(
        videoId,
        filters,
        searchKeyword,
        { topLevelOnly: true, excludeLiveChat: true }
    );

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

    // @deprecated - This will only sort/filter the VIEW BUFFER (current page)
    // Use liveFilteredCommentCount for total counts instead
    const filteredAndSortedComments = useMemo(() => {
        if (!filters) return [];
        let returnComments = comments;
        if (searchKeyword) {
            returnComments = searchComments(returnComments, searchKeyword);
        }
        returnComments = sortComments(returnComments, filters.sortBy, filters.sortOrder);
        returnComments = filterComments(returnComments, filters);
        return returnComments;
    }, [filters, sortComments, filterComments, comments, searchKeyword]);

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

    // Note: fetchTotalCommentsCount was removed as redundant.
    // useLiveCommentCount provides the same data reactively without extra DB queries.

    const transcriptWordCount = calculateFilteredWordCount(searchedTranscripts, searchKeyword);

    // Call useFetchDataOnUrlChange
    useFetchDataOnUrlChange();

    return {
        comments,
        filters,
        transcripts,
        initialLoadCompleted,
        filteredAndSortedComments,
        setFiltersCallback,
        showBookmarked,
        toggleShowBookmarked,
        activeTab,
        setActiveTab,
        transcriptWordCount,
        filteredAndSortedBookmarks,
        transcript: searchedTranscripts,
        totalCommentsCount,
        liveFilteredCommentCount, // Expose the new reactive count
        bookmarkedOnlyComments
    };
};

export default useAppState;
