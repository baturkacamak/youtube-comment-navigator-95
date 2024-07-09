import { useDispatch, useSelector } from 'react-redux';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { RootState } from '../../../types/rootState';
import { setBookmarkedComments, setComments, setFilters, setShowBookmarked } from '../../../store/store';
import useCommentsIncrementalLoader from '../../comments/hooks/useCommentsIncrementalLoader';
import useFilteredComments from '../../comments/hooks/useFilteredComments';
import useSearchContent from './useSearchContent';
import { Filters } from '../../../types/filterTypes';
import useTranscript from '../../transcripts/hooks/useTranscript';
import { calculateFilteredWordCount } from "../utils/calculateWordCount";
import useSortedComments from "../../comments/hooks/sorting/useSortedComments";
import { db } from "../utils/database/database";
import { Comment } from "../../../types/commentTypes"; // Ensure correct import

const useAppState = () => {
    const dispatch = useDispatch();
    const [activeTab, setActiveTab] = useState('comments');
    const [bookmarkedOnlyComments, setBookmarkedOnlyComments] = useState<Comment[]>([]);

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
        const bookmarks = await db.comments.where('bookmarkAddedDate').above('').toArray();
        if (bookmarks) {
            dispatch(setBookmarkedComments(bookmarks));
            setBookmarkedOnlyComments(bookmarks); // Update local state
        }
    }, [dispatch]);

    const fetchAllComments = useCallback(async () => {
        const allComments = await db.comments.toArray();
        if (allComments) {
            dispatch(setComments(allComments));
        }
    }, [dispatch]);

    useEffect(() => {
        fetchAllComments();
        fetchBookmarkedComments();
    }, [fetchAllComments, fetchBookmarkedComments]);

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

    const filteredAndSortedBookmarks = useMemo(() => {
        if (!filters) return [];
        return filterComments(
            sortComments(bookmarkedOnlyComments, filters.sortBy, filters.sortOrder),
            filters
        );
    }, [filters, sortComments, filterComments, bookmarkedOnlyComments]);

    const filteredAndSortedComments = useMemo(() => {
        if (!filters) return [];
        return filterComments(
            sortComments(comments, filters.sortBy, filters.sortOrder),
            filters
        );
    }, [filters, sortComments, filterComments, comments]);

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
        transcriptWordCount,
        filteredAndSortedBookmarks, // Expose this state for the BookmarkedComments component
    };
};

export default useAppState;
