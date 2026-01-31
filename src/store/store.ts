import { configureStore, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../types/rootState'; // Adjust the path as necessary
import { Comment } from '../types/commentTypes'; // Adjust the path as necessary
import { LiveChatMessage } from '../types/liveChatTypes';
import { FilterState } from '../types/filterTypes';
import { saveSettings } from '../features/settings/utils/settingsUtils';

// Helper function to safely load from localStorage
const loadPreference = <T>(key: string, defaultValue: T): T => {
  try {
    const saved = localStorage.getItem(key);
    return saved ? { ...defaultValue, ...JSON.parse(saved) } : defaultValue;
  } catch (e) {
    console.warn(`Failed to load preference for ${key}`, e);
    return defaultValue;
  }
};

const defaultFilters: FilterState = {
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
};

/**
 * Redux Store - View Buffer Architecture
 *
 * IndexedDB (Dexie) is the single source of truth for comment data.
 * Redux now serves as a "View Buffer" that holds:
 * - UI state (filters, settings, active tab, etc.)
 * - Temporary view data (currently displayed comments synced from DB queries)
 * - Count syncs from reactive database queries
 *
 * Data Flow:
 * 1. YouTube API -> fetchAndProcessComments -> IndexedDB (write)
 * 2. useCommentsFromDB hook -> IndexedDB query -> Component state
 * 3. totalCommentsCount synced to Redux for header/stat displays
 *
 * @see useCommentsFromDB for the main data consumption hook
 * @see pagination.ts for database query logic
 */
const initialState: RootState = {
  // Settings and filters
  settings: {
    textSize: 'text-base',
    fontFamily: 'Arial, sans-serif',
    showFiltersSorts: true,
    showContentOnSearch: false,
    geminiApiKey: '',
  },
  filters: loadPreference('filter_preferences', defaultFilters),

  // Comments View Buffer - holds currently displayed comments
  // Source of truth is IndexedDB, this is just for component rendering
  // @deprecated Use useCommentsFromDB hook instead of accessing this directly
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

  transcriptSelectedLanguage: loadPreference('transcript_language_preference', {
    value: '',
    label: 'Select Language',
  }),

  // Search keyword
  searchKeyword: '',

  // @deprecated Filtering/sorting now happens at DB level via pagination.ts
  filteredAndSortedComments: [],
  // Bookmarks still use in-memory filtering (may span multiple videos)
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
    // @deprecated Replies are now added directly to IndexedDB
    // UI updates via useLiveQuery in useCommentsFromDB hook
    addProcessedReplies: () => {
      // No-op: Kept for backward compatibility
      // Replies are persisted to IndexedDB and UI updates reactively
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
      localStorage.setItem('filter_preferences', JSON.stringify(action.payload));
    },
    setTextSize: (state, action: PayloadAction<string>) => {
      state.settings.textSize = action.payload;
      saveSettings({ textSize: state.settings.textSize });
    },
    setShowBookmarked: (state, action: PayloadAction<boolean>) => {
      state.showBookmarked = action.payload;
    },
    setShowFiltersSorts: (state, action: PayloadAction<boolean>) => {
      state.settings.showFiltersSorts = action.payload;
      saveSettings({ showFiltersSorts: state.settings.showFiltersSorts });
    },
    setFontFamily: (state, action: PayloadAction<string>) => {
      state.settings.fontFamily = action.payload;
      saveSettings({ fontFamily: state.settings.fontFamily });
    },
    setShowContentOnSearch: (state, action: PayloadAction<boolean>) => {
      state.settings.showContentOnSearch = action.payload;
      saveSettings({ showContentOnSearch: state.settings.showContentOnSearch });
    },
    setGeminiApiKey: (state, action: PayloadAction<string>) => {
      state.settings.geminiApiKey = action.payload;
      saveSettings({ geminiApiKey: state.settings.geminiApiKey });
    },

    setTranscriptSelectedLanguage: (
      state,
      action: PayloadAction<{ value: string; label: string }>
    ) => {
      state.transcriptSelectedLanguage = action.payload;
      localStorage.setItem('transcript_language_preference', JSON.stringify(action.payload));
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
  setGeminiApiKey,

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

export const commentsReducer = commentsSlice.reducer;

const store = configureStore({
  reducer: commentsSlice.reducer,
});

export default store;
export type { RootState }; // Export RootState type for useSelector
