import { configureStore, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../types/rootState'; // Adjust the path as necessary
import { Comment } from '../types/commentTypes'; // Adjust the path as necessary
import { FilterState } from '../types/filterTypes'; // Adjust the path as necessary

const initialState: RootState = {
    originalComments: [],
    comments: [],
    replies: [],
    transcripts: [],
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
    isLoading: true,
    commentsCount: 0,
    repliesCount: 0,
    transcriptsCount: 0,
    textSize: 'text-base',
    showBookmarked: false
};

const commentsSlice = createSlice({
    name: 'comments',
    initialState,
    reducers: {
        setInitialComments: (state, action: PayloadAction<Comment[]>) => {
            state.originalComments = action.payload;
        },
        setComments: (state, action: PayloadAction<Comment[]>) => {
            state.comments = action.payload;
        },
        setCommentsCount: (state, action: PayloadAction<number>) => {
            state.commentsCount = action.payload;
        },
        setReplies: (state, action: PayloadAction<any[]>) => {
            state.replies = action.payload;
        },
        setTranscripts: (state, action: PayloadAction<any[]>) => {
            state.transcripts = action.payload;
        },
        setFilters: (state, action: PayloadAction<FilterState>) => {
            state.filters = action.payload;
        },
        setLoading: (state, action: PayloadAction<boolean>) => {
            state.isLoading = action.payload;
        },
        setRepliesCount: (state, action: PayloadAction<number>) => {
            state.repliesCount = action.payload;
        },
        setTranscriptsCount: (state, action: PayloadAction<number>) => {
            state.transcriptsCount = action.payload;
        },
        setTextSize: (state, action: PayloadAction<string>) => {
            state.textSize = action.payload;
        },
        updateCommentsData: (state, action: PayloadAction<{ comments: Comment[]; isLoading: boolean }>) => {
            const { comments, isLoading } = action.payload;
            state.comments = [...state.comments, ...comments];
            state.isLoading = isLoading;
            state.commentsCount = state.comments.length;
        },
        setShowBookmarked: (state, action: PayloadAction<boolean>) => {
            state.showBookmarked = action.payload;
        },
        resetState: () => initialState,
    },
});

export const {
    setInitialComments,
    setComments,
    setReplies,
    setTranscripts,
    setFilters,
    setLoading,
    setCommentsCount,
    setRepliesCount,
    setTranscriptsCount,
    setTextSize,
    updateCommentsData,
    resetState,
    setShowBookmarked
} = commentsSlice.actions;

const store = configureStore({
    reducer: commentsSlice.reducer,
});

export default store;
export type { RootState }; // Export RootState type for useSelector


