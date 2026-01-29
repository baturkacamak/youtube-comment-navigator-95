import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import {
  commentsReducer,
  setTextSize,
  setShowFiltersSorts,
  setFontFamily,
  setShowContentOnSearch,
} from '../../store/store';
import { getSettings, saveSettings } from './utils/settingsUtils';
import type { RootState } from '../../types/rootState';

/**
 * Integration tests for settings functionality
 * Tests the interaction between Redux store and localStorage persistence
 */

describe('Settings Integration Tests - Redux & localStorage', () => {
  let store: ReturnType<typeof configureStore>;

  const defaultState: RootState = {
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
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Text Size Settings', () => {
    it('setTextSize updates Redux state and saves to localStorage', () => {
      store.dispatch(setTextSize('text-lg'));

      const state = store.getState() as RootState;
      expect(state.settings.textSize).toBe('text-lg');

      const savedSettings = getSettings();
      expect(savedSettings.textSize).toBe('text-lg');
    });

    it('multiple text size changes persist correctly', () => {
      store.dispatch(setTextSize('text-sm'));
      expect((store.getState() as RootState).settings.textSize).toBe('text-sm');

      store.dispatch(setTextSize('text-lg'));
      expect((store.getState() as RootState).settings.textSize).toBe('text-lg');

      store.dispatch(setTextSize('text-base'));
      expect((store.getState() as RootState).settings.textSize).toBe('text-base');

      const savedSettings = getSettings();
      expect(savedSettings.textSize).toBe('text-base');
    });
  });

  describe('Font Family Settings', () => {
    it('setFontFamily updates Redux state and saves to localStorage', () => {
      store.dispatch(setFontFamily('Georgia, serif'));

      const state = store.getState() as RootState;
      expect(state.settings.fontFamily).toBe('Georgia, serif');

      const savedSettings = getSettings();
      expect(savedSettings.fontFamily).toBe('Georgia, serif');
    });
  });

  describe('Show Filters/Sorts Settings', () => {
    it('setShowFiltersSorts updates Redux state and saves to localStorage', () => {
      store.dispatch(setShowFiltersSorts(false));

      const state = store.getState() as RootState;
      expect(state.settings.showFiltersSorts).toBe(false);

      const savedSettings = getSettings();
      expect(savedSettings.showFiltersSorts).toBe(false);
    });

    it('toggle showFiltersSorts multiple times', () => {
      store.dispatch(setShowFiltersSorts(false));
      expect((store.getState() as RootState).settings.showFiltersSorts).toBe(false);

      store.dispatch(setShowFiltersSorts(true));
      expect((store.getState() as RootState).settings.showFiltersSorts).toBe(true);

      const savedSettings = getSettings();
      expect(savedSettings.showFiltersSorts).toBe(true);
    });
  });

  describe('Show Content On Search Settings', () => {
    it('setShowContentOnSearch updates Redux state and saves to localStorage', () => {
      store.dispatch(setShowContentOnSearch(true));

      const state = store.getState() as RootState;
      expect(state.settings.showContentOnSearch).toBe(true);

      const savedSettings = getSettings();
      expect(savedSettings.showContentOnSearch).toBe(true);
    });
  });

  describe('Language Settings (localStorage only)', () => {
    it('saveSettings persists language to localStorage', () => {
      saveSettings({ language: 'es' });

      const savedSettings = getSettings();
      expect(savedSettings.language).toBe('es');
    });

    it('multiple language changes persist correctly', () => {
      saveSettings({ language: 'es' });
      expect(getSettings().language).toBe('es');

      saveSettings({ language: 'fr' });
      expect(getSettings().language).toBe('fr');

      saveSettings({ language: 'de' });
      expect(getSettings().language).toBe('de');
    });
  });

  describe('Theme Settings (localStorage only)', () => {
    it('saveSettings persists theme to localStorage', () => {
      saveSettings({ theme: 'dark' });

      const savedSettings = getSettings();
      expect(savedSettings.theme).toBe('dark');
    });

    it('theme changes between light, dark, and system', () => {
      saveSettings({ theme: 'dark' });
      expect(getSettings().theme).toBe('dark');

      saveSettings({ theme: 'light' });
      expect(getSettings().theme).toBe('light');

      saveSettings({ theme: 'system' });
      expect(getSettings().theme).toBe('system');
    });
  });

  describe('Error Handling', () => {
    it('getSettings handles corrupted localStorage gracefully', () => {
      localStorage.setItem('settings', 'INVALID_JSON{{{');

      // Should not throw
      const settings = getSettings();

      // Should return empty or default object
      expect(settings).toBeDefined();
      expect(typeof settings).toBe('object');
    });

    it('getSettings handles missing localStorage gracefully', () => {
      localStorage.removeItem('settings');

      const settings = getSettings();

      expect(settings).toBeDefined();
      expect(typeof settings).toBe('object');
    });

    it('saveSettings merges with existing settings', () => {
      saveSettings({ language: 'es' });
      saveSettings({ theme: 'dark' });
      saveSettings({ textSize: 'text-lg' });

      const settings = getSettings();
      expect(settings.language).toBe('es');
      expect(settings.theme).toBe('dark');
      expect(settings.textSize).toBe('text-lg');
    });
  });

  describe('Settings Persistence', () => {
    it('settings persist in localStorage after Redux dispatch', () => {
      // Save settings via Redux
      store.dispatch(setTextSize('text-lg'));
      store.dispatch(setFontFamily('Courier New, monospace'));

      // Verify localStorage has the settings
      const savedSettings = getSettings();
      expect(savedSettings.textSize).toBe('text-lg');
      expect(savedSettings.fontFamily).toBe('Courier New, monospace');

      // Simulate reading settings on "page reload"
      const reloadedSettings = getSettings();
      expect(reloadedSettings.textSize).toBe('text-lg');
      expect(reloadedSettings.fontFamily).toBe('Courier New, monospace');
    });
  });
});
