import {configureStore, createSlice, PayloadAction} from '@reduxjs/toolkit';
import {RootState} from '../types/rootState'; // Adjust the path as necessary
import {Comment} from '../types/commentTypes'; // Adjust the path as necessary
import {FilterState} from '../types/filterTypes';
import {saveSettings} from "../features/settings/utils/settingsUtils";

const initialState: RootState = {
    // Settings and filters
    settings: {
        textSize: 'text-base',
        fontFamily: 'Arial, sans-serif',
        showFiltersSorts: true,
        showContentOnSearch: false,
    },
    filters: {
        keyword: '',
        verified: false,
        hasLinks: false,
        sortBy: '',
        sortOrder: '',
        likesThreshold: {
            min: 0,
            max: Infinity,
        },
        repliesLimit: {
            min: 0,
            max: Infinity,
        },
        wordCount: {
            min: 0,
            max: Infinity,
        },
        dateTimeRange: {
            start: '',
            end: '',
        },
    },

    // Comments and transcripts data
    displayedComments: [],
    totalCommentCount: 0,
    replies: [],
    transcripts: [],
    filteredTranscripts: [],

    // Bookmark and loading state
    bookmarkedComments: [],
    bookmarkedLines: [],
    isLoading: true,

    // Other state properties
    showBookmarked: false,

    transcriptSelectedLanguage: {value: '', label: 'Select Language'},

    // Search keyword
    searchKeyword: '',

    filteredAndSortedComments: [],
    filteredAndSortedBookmarks: [],
};

const commentsSlice = createSlice({
    name: 'comments',
    initialState,
    reducers: {
        // Data fetching and setting actions
        setDisplayedComments: (state, action: PayloadAction<Comment[]>) => {
            state.displayedComments = action.payload;
        },
        setTotalCommentCount: (state, action: PayloadAction<number>) => {
            state.totalCommentCount = action.payload;
        },
        setReplies: (state, action: PayloadAction<any[]>) => {
            state.replies = action.payload;
        },
        setTranscripts: (state, action: PayloadAction<any[]>) => {
            state.transcripts = action.payload;
        },
        setFilteredTranscripts: (state, action: PayloadAction<any[]>) => {
            state.filteredTranscripts = action.payload;
        },
        addDisplayedComments: (state, action: PayloadAction<Comment[]>) => {
            // Add comments to displayed comments without duplicates
            const commentMap = new Map(state.displayedComments.map(comment => [comment.commentId, comment]));

            action.payload.forEach(comment => {
                commentMap.set(comment.commentId, comment);
            });

            state.displayedComments = Array.from(commentMap.values());
        },
        // Bookmark actions
        setBookmarkedComments: (state, action: PayloadAction<Comment[]>) => {
            state.bookmarkedComments = action.payload;
        },
        setBookmarkedLines: (state, action: PayloadAction<any[]>) => {
            state.bookmarkedLines = action.payload;
        },
        // Loading state action
        setIsLoading: (state, action: PayloadAction<boolean>) => {
            state.isLoading = action.payload;
        },

        // Filter and settings actions
        setFilters: (state, action: PayloadAction<FilterState>) => {
            state.filters = action.payload;
        },
        setTextSize: (state, action: PayloadAction<string>) => {
            state.settings.textSize = action.payload;
            saveSettings({textSize: state.settings.textSize});
        },
        setShowBookmarked: (state, action: PayloadAction<boolean>) => {
            state.showBookmarked = action.payload;
        },
        setShowFiltersSorts: (state, action: PayloadAction<boolean>) => {
            state.settings.showFiltersSorts = action.payload;
            saveSettings({showFiltersSorts: state.settings.showFiltersSorts});
        },
        setFontFamily: (state, action: PayloadAction<string>) => {
            state.settings.fontFamily = action.payload;
            saveSettings({fontFamily: state.settings.fontFamily});
        },
        setShowContentOnSearch: (state, action: PayloadAction<boolean>) => {
            state.settings.showContentOnSearch = action.payload;
            saveSettings({ showContentOnSearch: state.settings.showContentOnSearch });
        },

        setTranscriptSelectedLanguage: (state, action: PayloadAction<{ value: string, label: string }>) => {
            state.transcriptSelectedLanguage = action.payload;
        },

        // Reset action
        resetState: () => initialState,

        // Search keyword actions
        setSearchKeyword: (state, action: PayloadAction<string>) => {
            state.searchKeyword = action.payload;
        },
        clearSearchKeyword: (state) => {
            state.searchKeyword = '';
        },

        setFilteredAndSortedComments(state, action: PayloadAction<Comment[]>) {
            state.filteredAndSortedComments = action.payload;
        },
        setFilteredAndSortedBookmarks(state, action: PayloadAction<Comment[]>) {
            state.filteredAndSortedBookmarks = action.payload;
        },

        clearDisplayedComments(state) {
            state.displayedComments = [];
        },
    },
});

export const {
    // Data fetching and setting actions
    setDisplayedComments,
    setTotalCommentCount,
    setReplies,
    setTranscripts,
    setFilteredTranscripts,
    addDisplayedComments,

    // Bookmark actions
    setBookmarkedComments,
    setBookmarkedLines,

    // Loading state action
    setIsLoading,

    // Filter and settings actions
    setFilters,
    setTextSize,
    setShowBookmarked,
    setShowFiltersSorts,
    setFontFamily,
    setShowContentOnSearch,

    setTranscriptSelectedLanguage,
    // Reset action
    resetState,

    // Search keyword actions
    setSearchKeyword,
    clearSearchKeyword,

    setFilteredAndSortedComments,
    setFilteredAndSortedBookmarks,

    clearDisplayedComments,
} = commentsSlice.actions;

const store = configureStore({
    reducer: commentsSlice.reducer,
});

export default store;
export type {RootState}; // Export RootState type for useSelector