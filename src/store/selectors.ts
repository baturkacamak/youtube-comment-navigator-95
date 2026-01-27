// src/store/selectors.ts
// Memoized selectors to prevent unnecessary re-renders
import { createSelector } from '@reduxjs/toolkit';
import { RootState } from '../types/rootState';

// Base selectors - simple state access
const selectCommentsState = (state: RootState) => state.comments;
const selectFiltersState = (state: RootState) => state.filters;
const selectIsLoadingState = (state: RootState) => state.isLoading;
const selectTotalCommentsCountState = (state: RootState) => state.totalCommentsCount;
const selectShowBookmarkedState = (state: RootState) => state.showBookmarked;
const selectTranscriptsState = (state: RootState) => state.transcripts;
const selectSearchKeywordState = (state: RootState) => state.searchKeyword;
const selectSettingsState = (state: RootState) => state.settings;
const selectBookmarkedCommentsState = (state: RootState) => state.bookmarkedComments;
const selectLiveChatState = (state: RootState) => state.liveChat;
const selectLiveChatMessageCountState = (state: RootState) => state.liveChatMessageCount;
const selectBookmarkedLiveChatMessagesState = (state: RootState) => state.bookmarkedLiveChatMessages;
const selectTranscriptSelectedLanguageState = (state: RootState) => state.transcriptSelectedLanguage;

// Memoized selectors - prevent re-renders when value hasn't changed
export const selectComments = createSelector([selectCommentsState], (comments) => comments);
export const selectFilters = createSelector([selectFiltersState], (filters) => filters);
export const selectIsLoading = createSelector([selectIsLoadingState], (isLoading) => isLoading);
export const selectTotalCommentsCount = createSelector([selectTotalCommentsCountState], (count) => count);
export const selectShowBookmarked = createSelector([selectShowBookmarkedState], (show) => show);
export const selectTranscripts = createSelector([selectTranscriptsState], (transcripts) => transcripts);
export const selectSearchKeyword = createSelector([selectSearchKeywordState], (keyword) => keyword);
export const selectSettings = createSelector([selectSettingsState], (settings) => settings);
export const selectBookmarkedComments = createSelector([selectBookmarkedCommentsState], (comments) => comments);
export const selectLiveChat = createSelector([selectLiveChatState], (liveChat) => liveChat);
export const selectLiveChatMessageCount = createSelector([selectLiveChatMessageCountState], (count) => count);
export const selectBookmarkedLiveChatMessages = createSelector([selectBookmarkedLiveChatMessagesState], (messages) => messages);
export const selectTranscriptSelectedLanguage = createSelector([selectTranscriptSelectedLanguageState], (lang) => lang);

// Derived selectors - computed values that depend on multiple state slices
export const selectTextSize = createSelector([selectSettings], (settings) => settings.textSize);
export const selectFontFamily = createSelector([selectSettings], (settings) => settings.fontFamily);
export const selectShowFiltersSorts = createSelector([selectSettings], (settings) => settings.showFiltersSorts);
export const selectShowContentOnSearch = createSelector([selectSettings], (settings) => settings.showContentOnSearch);

// Filter-specific selectors
export const selectSortBy = createSelector([selectFilters], (filters) => filters.sortBy);
export const selectSortOrder = createSelector([selectFilters], (filters) => filters.sortOrder);
export const selectKeyword = createSelector([selectFilters], (filters) => filters.keyword);
