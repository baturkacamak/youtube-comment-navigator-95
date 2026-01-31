import { describe, it, expect, beforeEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import {
  commentsReducer,
  setSearchKeyword,
  clearSearchKeyword,
  setFilteredAndSortedComments,
} from '../../store/store';
import { searchComments } from './services/commentSearchService';
import { mockComments } from '../../../tests/mocks/mockComments';
import type { RootState } from '../../types/rootState';

/**
 * Integration tests for search functionality
 * Tests the interaction between Redux state and search service
 */

describe('Search Functionality Integration Tests', () => {
  let store: ReturnType<typeof configureStore>;

  const defaultState: RootState = {
    settings: {
      textSize: 'text-base',
      fontFamily: 'Arial, sans-serif',
      showFiltersSorts: true,
      showContentOnSearch: false,
      geminiApiKey: '',
    },
    filters: {
      keyword: '',
      verified: false,
      hasLinks: false,
      sortBy: '',
      sortOrder: '',
      likesThreshold: { min: 0, max: Infinity },
      repliesLimit: { min: 0, max: Infinity },
      wordCount: { min: 0, max: Infinity },
      dateTimeRange: { start: '', end: '' },
    },
    comments: mockComments,
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
    bookmarkedComments: [],
    bookmarkedLiveChatMessages: [],
    bookmarkedLines: [],
    isLoading: false,
    totalCommentsCount: mockComments.length,
    liveChatMessageCount: 0,
    showBookmarked: false,
    transcriptSelectedLanguage: { value: '', label: 'Select Language' },
    searchKeyword: '',
    filteredAndSortedComments: [],
    filteredAndSortedBookmarks: [],
  };

  beforeEach(() => {
    store = configureStore({
      reducer: commentsReducer,
      preloadedState: defaultState,
    });
  });

  describe('Search Keyword State', () => {
    it('setSearchKeyword updates Redux state', () => {
      store.dispatch(setSearchKeyword('great'));

      const state = store.getState() as RootState;
      expect(state.searchKeyword).toBe('great');
    });

    it('clearSearchKeyword resets search to empty', () => {
      store.dispatch(setSearchKeyword('test'));
      store.dispatch(clearSearchKeyword());

      const state = store.getState() as RootState;
      expect(state.searchKeyword).toBe('');
    });

    it('multiple search keyword changes work correctly', () => {
      store.dispatch(setSearchKeyword('great'));
      expect((store.getState() as RootState).searchKeyword).toBe('great');

      store.dispatch(setSearchKeyword('explanation'));
      expect((store.getState() as RootState).searchKeyword).toBe('explanation');

      store.dispatch(setSearchKeyword(''));
      expect((store.getState() as RootState).searchKeyword).toBe('');
    });
  });

  describe('Search Service Integration', () => {
    it('filters comments by search keyword', () => {
      const state = store.getState() as RootState;
      const results = searchComments(state.comments, 'great');

      expect(results.length).toBe(1);
      expect(results[0].content).toBe('This is a great video!');
    });

    it('search is case-insensitive', () => {
      const state = store.getState() as RootState;
      const lowerResults = searchComments(state.comments, 'great');
      const upperResults = searchComments(state.comments, 'GREAT');

      expect(lowerResults.length).toBe(upperResults.length);
    });

    it('shows no results for non-matching query', () => {
      const state = store.getState() as RootState;
      const results = searchComments(state.comments, 'xyznonexistent');

      expect(results.length).toBe(0);
    });

    it('searches in comment content', () => {
      const state = store.getState() as RootState;

      // Search by content
      const contentResults = searchComments(state.comments, 'agree');
      expect(contentResults.length).toBeGreaterThan(0);
      expect(contentResults.some((c) => c.content.toLowerCase().includes('agree'))).toBe(true);
    });

    it('handles special characters in search', () => {
      const state = store.getState() as RootState;

      // Should not throw
      expect(() => searchComments(state.comments, '(test)')).not.toThrow();
      expect(() => searchComments(state.comments, '[test]')).not.toThrow();
      expect(() => searchComments(state.comments, 'test?')).not.toThrow();
      expect(() => searchComments(state.comments, 'test*')).not.toThrow();
    });

    it('handles empty search query', () => {
      const state = store.getState() as RootState;
      const results = searchComments(state.comments, '');

      // Empty search should return all comments or empty array depending on implementation
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('Search with Filtered Comments State', () => {
    it('setFilteredAndSortedComments stores filtered results', () => {
      const state = store.getState() as RootState;
      const filtered = searchComments(state.comments, 'great');

      store.dispatch(setFilteredAndSortedComments(filtered));

      const newState = store.getState() as RootState;
      expect(newState.filteredAndSortedComments.length).toBe(1);
      expect(newState.filteredAndSortedComments[0].content).toBe('This is a great video!');
    });

    it('clearing search restores all comments', () => {
      // Apply filter
      const state = store.getState() as RootState;
      const filtered = searchComments(state.comments, 'great');
      store.dispatch(setFilteredAndSortedComments(filtered));
      store.dispatch(setSearchKeyword('great'));

      // Clear search
      store.dispatch(clearSearchKeyword());
      store.dispatch(setFilteredAndSortedComments(mockComments));

      const newState = store.getState() as RootState;
      expect(newState.searchKeyword).toBe('');
      expect(newState.filteredAndSortedComments.length).toBe(mockComments.length);
    });
  });

  describe('Search Performance', () => {
    it('handles rapid search changes', () => {
      const searches = ['great', 'explanation', 'agree', 'video', 'cleared', ''];

      for (const keyword of searches) {
        store.dispatch(setSearchKeyword(keyword));
        const state = store.getState() as RootState;
        expect(state.searchKeyword).toBe(keyword);

        // Perform search
        const results = searchComments(state.comments, keyword);
        expect(Array.isArray(results)).toBe(true);
      }
    });

    it('handles long search queries', () => {
      const longQuery = 'a'.repeat(1000);

      expect(() => {
        store.dispatch(setSearchKeyword(longQuery));
        const state = store.getState() as RootState;
        searchComments(state.comments, longQuery);
      }).not.toThrow();
    });
  });

  describe('Fuzzy Search', () => {
    it('finds comments with typos in search query', () => {
      const state = store.getState() as RootState;

      // "explanatin" is a typo for "explanation"
      const results = searchComments(state.comments, 'explanatin');

      expect(results.length).toBeGreaterThan(0);
      expect(results.some((c) => c.content.includes('explanation'))).toBe(true);
    });
  });
});
