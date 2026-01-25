import {configureStore, createSlice, PayloadAction} from '@reduxjs/toolkit';
import {RootState} from '../types/rootState'; // Adjust the path as necessary
import {Comment} from '../types/commentTypes'; // Adjust the path as necessary
import {LiveChatMessage, LiveChatErrorType} from '../types/liveChatTypes';
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
    comments: [],
    liveChat: [],
    liveChatState: {
        isLoading: false,
        error: null,
        lastFetchTime: null,
        messageCount: 0,
        continuationToken: null,
        isReplay: false,
    },
    transcripts: [],
    filteredTranscripts: [],

    // Bookmark and loading state
    bookmarkedComments: [],
    bookmarkedLiveChatMessages: [],
    bookmarkedLines: [],
    isLoading: true,

    totalCommentsCount: 0,
    liveChatMessageCount: 0,
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
        setComments: (state, action: PayloadAction<Comment[]>) => {
            state.comments = action.payload;
        },
        setLiveChat: (state, action: PayloadAction<LiveChatMessage[]>) => {
            state.liveChat = action.payload;
        },
        appendLiveChat: (state, action: PayloadAction<LiveChatMessage[]>) => {
            state.liveChat = [...state.liveChat, ...action.payload];
        },
        setLiveChatLoading: (state, action: PayloadAction<boolean>) => {
            state.liveChatState.isLoading = action.payload;
        },
        setLiveChatError: (state, action: PayloadAction<string | null>) => {
            state.liveChatState.error = action.payload;
        },
        setLiveChatMessageCount: (state, action: PayloadAction<number>) => {
            state.liveChatMessageCount = action.payload;
            state.liveChatState.messageCount = action.payload;
        },
        setBookmarkedLiveChatMessages: (state, action: PayloadAction<LiveChatMessage[]>) => {
            state.bookmarkedLiveChatMessages = action.payload;
        },
        setTranscripts: (state, action: PayloadAction<any[]>) => {
            state.transcripts = action.payload;
        },
        setFilteredTranscripts: (state, action: PayloadAction<any[]>) => {
            state.filteredTranscripts = action.payload;
        },
        addProcessedReplies: (state, action: PayloadAction<Comment[]>) => {
            action.payload.forEach(reply => {
                state.comments.push(reply);
                state.filteredAndSortedComments.push(reply);
            });
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
        appendComments: (state, action: PayloadAction<Comment[]>) => {
            state.comments = [...state.comments, ...action.payload];
        },
        setTotalCommentsCount: (state, action: PayloadAction<number>) => {
            state.totalCommentsCount = action.payload;
        },
    },
});

export const {
    // Data fetching and setting actions
    setComments,
    setLiveChat,
    appendLiveChat,
    setLiveChatLoading,
    setLiveChatError,
    setLiveChatMessageCount,
    setTranscripts,
    setFilteredTranscripts,
    addProcessedReplies,
    // Bookmark actions
    setBookmarkedComments,
    setBookmarkedLiveChatMessages,
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

    appendComments,

    setFilteredAndSortedComments,
    setFilteredAndSortedBookmarks,
    setTotalCommentsCount,
} = commentsSlice.actions;

const store = configureStore({
    reducer: commentsSlice.reducer,
});

export default store;
export type {RootState}; // Export RootState type for useSelector


