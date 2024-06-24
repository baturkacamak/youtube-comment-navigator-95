import {configureStore, createSlice, PayloadAction} from '@reduxjs/toolkit';
import {RootState} from '../types/rootState'; // Adjust the path as necessary
import {Comment} from '../types/commentTypes'; // Adjust the path as necessary
import {FilterState} from '../types/filterTypes';
import {saveSettings} from "../features/settings/utils/settingsUtils";
import {storeDataInDB} from "../features/shared/utils/cacheUtils"; // Adjust the path as necessary

const initialState: RootState = {
    // Settings and filters
    settings: {
        textSize: 'text-base',
        showFiltersSorts: true,
    },
    filters: {
        keyword: '',
        minLikes: 0,
        minDislikes: 0,
        startDate: '',
        endDate: '',
        user: '',
        verified: false,
        hasLinks: false,
        minLength: 0,
        maxLength: Infinity,
        extendedSearch: false,
        sortBy: '',
        sortOrder: '',
    },

    // Comments and transcripts data
    originalComments: [],
    comments: [],
    replies: [],
    transcripts: [],
    filteredTranscripts: [],

    // Bookmark and loading state
    bookmarkedComments: [],
    bookmarkedLines: [],
    isLoading: true,

    // Count-related properties
    commentsCount: 0,
    repliesCount: 0,
    transcriptsCount: 0,

    // Other state properties
    showBookmarked: false,
    isUrlChanged: false,

    transcriptSelectedLanguage: {value: '', label: 'Select Language'},
};

const commentsSlice = createSlice({
    name: 'comments',
    initialState,
    reducers: {
        // Data fetching and setting actions
        setInitialComments: (state, action: PayloadAction<Comment[]>) => {
            state.originalComments = action.payload;
        },
        setComments: (state, action: PayloadAction<Comment[]>) => {
            state.comments = action.payload;
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
        updateCommentsData: (state, action: PayloadAction<{ comments: Comment[]; isLoading: boolean }>) => {
            const {comments, isLoading} = action.payload;
            state.comments = [...state.comments, ...comments];
            state.isLoading = isLoading;
            state.commentsCount = state.comments.length;
        },

        // Count-related actions
        setCommentsCount: (state, action: PayloadAction<number>) => {
            state.commentsCount = action.payload;
        },
        setRepliesCount: (state, action: PayloadAction<number>) => {
            state.repliesCount = action.payload;
        },
        setTranscriptsCount: (state, action: PayloadAction<number>) => {
            state.transcriptsCount = action.payload;
        },

        // Bookmark actions
        setBookmarkedComments: (state, action: PayloadAction<Comment[]>) => {
            state.bookmarkedComments = action.payload;
        },
        setBookmarkedLines: (state, action: PayloadAction<any[]>) => {
            state.bookmarkedLines = action.payload;
            storeDataInDB('bookmarkedLines', action.payload); // Save to DB whenever state changes
        },

        // Loading state action
        setLoading: (state, action: PayloadAction<boolean>) => {
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
        setIsUrlChanged: (state, action: PayloadAction<boolean>) => {
            state.isUrlChanged = action.payload;
        },
        setShowFiltersSorts: (state, action: PayloadAction<boolean>) => {
            state.settings.showFiltersSorts = action.payload;
            saveSettings({showFiltersSorts: state.settings.showFiltersSorts});
        },

        setTranscriptSelectedLanguage: (state, action: PayloadAction<{ value: string, label: string }>) => {
            state.transcriptSelectedLanguage = action.payload;
        },

        // Reset action
        resetState: () => initialState,
    },
});

export const {
    // Data fetching and setting actions
    setInitialComments,
    setComments,
    setReplies,
    setTranscripts,
    setFilteredTranscripts,
    updateCommentsData,

    // Count-related actions
    setCommentsCount,
    setRepliesCount,
    setTranscriptsCount,

    // Bookmark actions
    setBookmarkedComments,
    setBookmarkedLines,

    // Loading state action
    setLoading,

    // Filter and settings actions
    setFilters,
    setTextSize,
    setShowBookmarked,
    setIsUrlChanged,
    setShowFiltersSorts,
    setTranscriptSelectedLanguage,
    // Reset action
    resetState,
} = commentsSlice.actions;

const store = configureStore({
    reducer: commentsSlice.reducer,
});

export default store;
export type {RootState}; // Export RootState type for useSelector


