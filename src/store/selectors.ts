// src/store/selectors.ts
// Selectors for accessing Redux state
import { createSelector } from '@reduxjs/toolkit';
import { RootState } from '../types/rootState';

// Simple selectors - direct state access (no createSelector needed)
// These are already memoized by useSelector's reference equality check
export const selectComments = (state: RootState) => state.comments;
export const selectFilters = (state: RootState) => state.filters;
export const selectIsLoading = (state: RootState) => state.isLoading;
export const selectTotalCommentsCount = (state: RootState) => state.totalCommentsCount;
export const selectShowBookmarked = (state: RootState) => state.showBookmarked;
export const selectTranscripts = (state: RootState) => state.transcripts;
export const selectSearchKeyword = (state: RootState) => state.searchKeyword;
export const selectSettings = (state: RootState) => state.settings;
export const selectBookmarkedComments = (state: RootState) => state.bookmarkedComments;
export const selectLiveChat = (state: RootState) => state.liveChat;
export const selectLiveChatMessageCount = (state: RootState) => state.liveChatMessageCount;
export const selectBookmarkedLiveChatMessages = (state: RootState) =>
  state.bookmarkedLiveChatMessages;
export const selectTranscriptSelectedLanguage = (state: RootState) =>
  state.transcriptSelectedLanguage;

// Derived selectors - use createSelector ONLY when computing/transforming values
// These memoize the computed result and only recompute when input changes
export const selectTextSize = createSelector([selectSettings], (settings) => settings.textSize);

export const selectFontFamily = createSelector([selectSettings], (settings) => settings.fontFamily);

export const selectShowFiltersSorts = createSelector(
  [selectSettings],
  (settings) => settings.showFiltersSorts
);

export const selectShowContentOnSearch = createSelector(
  [selectSettings],
  (settings) => settings.showContentOnSearch
);

// Filter-specific selectors
export const selectSortBy = createSelector([selectFilters], (filters) => filters.sortBy);

export const selectSortOrder = createSelector([selectFilters], (filters) => filters.sortOrder);

export const selectKeyword = createSelector([selectFilters], (filters) => filters.keyword);
