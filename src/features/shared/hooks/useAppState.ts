import { useDispatch, useSelector } from 'react-redux';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { RootState } from '../../../types/rootState';
import { setBookmarkedComments, setFilters, setShowBookmarked } from '../../../store/store';
import useCommentsIncrementalLoader from '../../comments/hooks/useCommentsIncrementalLoader';
import useFilteredComments from '../../comments/hooks/useFilteredComments';
import { Filters } from '../../../types/filterTypes';
import { calculateFilteredWordCount } from "../utils/calculateWordCount";
import useSortedComments from "../../comments/hooks/sorting/useSortedComments";
import { db } from "../utils/database/database";
import { Comment } from "../../../types/commentTypes";
import { searchComments } from "../../comments/services/commentSearchService";
import { searchTranscripts } from "../../comments/services/transcriptSearchService";
import useFetchDataOnUrlChange from "../hooks/urlChange/useFetchDataOnUrlChange";

const useAppState = () => {
    const dispatch = useDispatch();
    const [activeTab, setActiveTab] = useState('comments');
    const [bookmarkedOnlyComments, setBookmarkedOnlyComments] = useState<Comment[]>([]);

    const displayedComments = useSelector((state: RootState) => state.displayedComments);
    const filters = useSelector((state: RootState) => state.filters);
    const showBookmarked = useSelector((state: RootState) => state.showBookmarked);
    const transcripts = useSelector((state: RootState) => state.transcripts);
    const searchKeyword = useSelector((state: RootState) => state.searchKeyword);

    const { sortComments } = useSortedComments(false);
    const { filterComments } = useFilteredComments(false);
    const { initialLoadCompleted } = useCommentsIncrementalLoader();

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
    }, [activeTab, fetchBookmarkedComments, searchKeyword, dispatch]);

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

    const filteredAndSortedComments = useMemo(() => {
        if (!filters) return [];
        let returnComments = displayedComments; // Burada comments yerine displayedComments kullanılıyor
        if (searchKeyword) {
            returnComments = searchComments(returnComments, searchKeyword);
        }
        returnComments = sortComments(returnComments, filters.sortBy, filters.sortOrder);
        returnComments = filterComments(returnComments, filters);
        return returnComments;
    }, [filters, sortComments, filterComments, displayedComments, searchKeyword]);

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

    const transcriptWordCount = calculateFilteredWordCount(searchedTranscripts, searchKeyword);

    // Call useFetchDataOnUrlChange
    useFetchDataOnUrlChange();

    return {
        displayedComments, // comments yerine displayedComments dönüyoruz
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
    };
};

export default useAppState;