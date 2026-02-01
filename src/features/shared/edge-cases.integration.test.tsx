import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import {
  commentsReducer,
  setComments,
  setFilters,
  setIsLoading,
  resetState,
} from '../../store/store';
import { getSettings, saveSettings } from '../settings/utils/settingsUtils';
import { searchComments } from '../comments/services/commentSearchService';
import { mockComments } from '../../../tests/mocks/mockComments';
import type { RootState } from '../../types/rootState';
import type { FilterState } from '../../types/filterTypes';

/**
 * Integration tests for edge cases and error scenarios
 * Tests the application behavior in unusual or error conditions
 */

describe('Edge Cases Integration Tests', () => {
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
    bookmarkedComments: [],
    bookmarkedLiveChatMessages: [],
    bookmarkedLines: [],
    isLoading: false,
    totalCommentsCount: 0,
    liveChatMessageCount: 0,
    showBookmarked: false,
    transcriptSelectedLanguage: { value: '', label: 'Select Language' },
    searchKeyword: '',
    filteredAndSortedComments: [],
    filteredAndSortedBookmarks: [],
  };

  beforeEach(() => {
    localStorage.clear();
    store = configureStore({
      reducer: commentsReducer,
      preloadedState: defaultState,
    });
    vi.spyOn(console, 'error').mockImplementation(() => { /* no-op */ });
    vi.spyOn(console, 'warn').mockImplementation(() => { /* no-op */ });
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('Malformed Data Handling', () => {
    it('handles corrupted localStorage settings gracefully', () => {
      localStorage.setItem('settings', 'corrupted{json');

      const settings = getSettings();

      expect(settings).toBeDefined();
      expect(typeof settings).toBe('object');
    });

    it('handles missing localStorage gracefully', () => {
      localStorage.removeItem('settings');

      const settings = getSettings();

      expect(settings).toBeDefined();
      expect(typeof settings).toBe('object');
    });

    it('handles invalid settings values in localStorage', () => {
      localStorage.setItem(
        'settings',
        JSON.stringify({
          theme: 'invalid-theme',
          textSize: 99999,
          language: 'xx',
        })
      );

      // Should not throw when reading
      const settings = getSettings();
      expect(settings.theme).toBe('invalid-theme');

      // App should use defaults/validation in components
    });

    it('handles null values in settings', () => {
      localStorage.setItem(
        'settings',
        JSON.stringify({
          theme: null,
          textSize: null,
        })
      );

      const settings = getSettings();
      expect(settings).toBeDefined();
    });
  });

  describe('Empty/Zero State Handling', () => {
    it('handles empty comments array', () => {
      store.dispatch(setComments([]));

      const state = store.getState() as RootState;
      expect(state.comments.length).toBe(0);
    });

    it('search handles empty comments array', () => {
      const results = searchComments([], 'test');

      expect(results).toEqual([]);
    });

    it('handles zero filters correctly', () => {
      const emptyFilters: FilterState = {
        keyword: '',
        verified: false,
        hasLinks: false,
        sortBy: '',
        sortOrder: '',
        likesThreshold: { min: 0, max: 0 },
        repliesLimit: { min: 0, max: 0 },
        wordCount: { min: 0, max: 0 },
        dateTimeRange: { start: '', end: '' },
      };

      store.dispatch(setFilters(emptyFilters));

      const state = store.getState() as RootState;
      expect(state.filters.likesThreshold.max).toBe(0);
    });
  });

  describe('Loading State Handling', () => {
    it('isLoading state transitions correctly', () => {
      expect((store.getState() as RootState).isLoading).toBe(false);

      store.dispatch(setIsLoading(true));
      expect((store.getState() as RootState).isLoading).toBe(true);

      store.dispatch(setIsLoading(false));
      expect((store.getState() as RootState).isLoading).toBe(false);
    });

    it('rapid loading state changes do not corrupt state', () => {
      for (let i = 0; i < 100; i++) {
        store.dispatch(setIsLoading(i % 2 === 0));
      }

      const state = store.getState() as RootState;
      expect(typeof state.isLoading).toBe('boolean');
    });
  });

  describe('State Reset', () => {
    it('resetState returns to initial state', () => {
      // Modify state
      store.dispatch(setComments(mockComments));
      store.dispatch(setIsLoading(true));

      // Reset
      store.dispatch(resetState());

      const state = store.getState() as RootState;
      expect(state.comments.length).toBe(0);
      expect(state.isLoading).toBe(true); // Note: initial state has isLoading: true
    });
  });

  describe('Filter Edge Cases', () => {
    it('handles Infinity in filter thresholds', () => {
      const filters: FilterState = {
        keyword: '',
        verified: false,
        hasLinks: false,
        sortBy: '',
        sortOrder: '',
        likesThreshold: { min: 0, max: Infinity },
        repliesLimit: { min: 0, max: Infinity },
        wordCount: { min: 0, max: Infinity },
        dateTimeRange: { start: '', end: '' },
      };

      store.dispatch(setFilters(filters));

      const state = store.getState() as RootState;
      expect(state.filters.likesThreshold.max).toBe(Infinity);
    });

    it('handles negative values in filter thresholds', () => {
      const filters: FilterState = {
        keyword: '',
        verified: false,
        hasLinks: false,
        sortBy: '',
        sortOrder: '',
        likesThreshold: { min: -1, max: -1 },
        repliesLimit: { min: -1, max: -1 },
        wordCount: { min: -1, max: -1 },
        dateTimeRange: { start: '', end: '' },
      };

      store.dispatch(setFilters(filters));

      const state = store.getState() as RootState;
      expect(state.filters.likesThreshold.min).toBe(-1);
    });
  });

  describe('Search Edge Cases', () => {
    it('handles very long search queries', () => {
      const longQuery = 'a'.repeat(10000);

      expect(() => {
        searchComments(mockComments, longQuery);
      }).not.toThrow();
    });

    it('handles unicode characters in search', () => {
      const unicodeQuery = '测试 테스트 тест';

      expect(() => {
        searchComments(mockComments, unicodeQuery);
      }).not.toThrow();
    });

    it('handles emoji in search', () => {
      const emojiQuery = '🎉 test 👍';

      expect(() => {
        searchComments(mockComments, emojiQuery);
      }).not.toThrow();
    });

    it('handles regex special characters in search', () => {
      const specialChars = ['()', '[]', '{ /* no-op */ }', '\\', '^', '$', '.', '|', '?', '*', '+'];

      for (const char of specialChars) {
        expect(() => {
          searchComments(mockComments, char);
        }).not.toThrow();
      }
    });
  });

  describe('Comment Data Edge Cases', () => {
    it('handles comments with missing fields', () => {
      const incompleteComments = [
        {
          author: 'Test',
          likes: 0,
          viewLikes: '0',
          content: '',
          published: '',
          publishedDate: 0,
          authorAvatarUrl: '',
          isAuthorContentCreator: false,
          authorChannelId: '',
          replyCount: 0,
          commentId: '1',
          commentParentId: undefined,
          replyLevel: 0,
          hasTimestamp: false,
          hasLinks: false,
        },
      ];

      store.dispatch(setComments(incompleteComments));

      const state = store.getState() as RootState;
      expect(state.comments.length).toBe(1);
    });

    it('handles comments with very long content', () => {
      const longContent = 'a'.repeat(50000);
      const longComments = [
        {
          ...mockComments[0],
          content: longContent,
        },
      ];

      store.dispatch(setComments(longComments));

      const state = store.getState() as RootState;
      expect(state.comments[0].content.length).toBe(50000);
    });
  });

  describe('LocalStorage Edge Cases', () => {
    it('handles localStorage full error gracefully', () => {
      // This simulates localStorage being full
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = () => {
        throw new Error('QuotaExceededError');
      };

      // Should not throw
      expect(() => {
        saveSettings({ theme: 'dark' });
      }).not.toThrow();

      localStorage.setItem = originalSetItem;
    });

    it('merges settings correctly', () => {
      saveSettings({ theme: 'dark' });
      saveSettings({ language: 'es' });
      saveSettings({ textSize: 'text-lg' });

      const settings = getSettings();
      expect(settings.theme).toBe('dark');
      expect(settings.language).toBe('es');
      expect(settings.textSize).toBe('text-lg');
    });
  });
});
