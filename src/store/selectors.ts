// src/store/selectors.ts
import { createSelector } from '@reduxjs/toolkit';

const selectCommentsState = (state: any) => state.comments;
const selectOriginalCommentsState = (state: any) => state.originalComments;
const selectFiltersState = (state: any) => state.filters;
const selectIsLoadingState = (state: any) => state.isLoading;
const selectCommentsCountState = (state: any) => state.commentsCount;
const selectRepliesCountState = (state: any) => state.repliesCount;
const selectTranscriptsCountState = (state: any) => state.transcriptsCount;

export const selectComments = createSelector([selectCommentsState], (comments) => comments);
export const selectOriginalComments = createSelector([selectOriginalCommentsState], (originalComments) => originalComments);
export const selectFilters = createSelector([selectFiltersState], (filters) => filters);
export const selectIsLoading = createSelector([selectIsLoadingState], (isLoading) => isLoading);
export const selectCommentsCount = createSelector([selectCommentsCountState], (commentsCount) => commentsCount);
export const selectRepliesCount = createSelector([selectRepliesCountState], (repliesCount) => repliesCount);
export const selectTranscriptsCount = createSelector([selectTranscriptsCountState], (transcriptsCount) => transcriptsCount);
