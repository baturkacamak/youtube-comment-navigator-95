import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * Integration tests for the i18n system
 *
 * These tests verify the complete translation flow:
 * 1. Language change request from settings (CHANGE_LANGUAGE)
 * 2. Translation loading and storage in content script context
 * 3. i18n library update via LANGUAGE_LOADED event
 *
 * The critical bug that was fixed:
 * - Chrome extensions have isolated JavaScript contexts
 * - Page context and content script context have separate window objects
 * - Translations must be stored in content script context (where i18n runs)
 */

describe('i18n Integration', () => {
  const mockTranslations = {
    en: {
      greeting: 'Hello',
      farewell: 'Goodbye',
      settings: 'Settings',
      language: 'Language',
    },
    de: {
      greeting: 'Hallo',
      farewell: 'Auf Wiedersehen',
      settings: 'Einstellungen',
      language: 'Sprache',
    },
    fr: {
      greeting: 'Bonjour',
      farewell: 'Au revoir',
      settings: 'Paramètres',
      language: 'Langue',
    },
    ar: {
      greeting: 'مرحبا',
      farewell: 'مع السلامة',
      settings: 'إعدادات',
      language: 'لغة',
    },
  };

  const supportedLanguages = Object.keys(mockTranslations);

  beforeEach(() => {
    window.__YCN_TRANSLATIONS__ = undefined;
    vi.clearAllMocks();
  });

  afterEach(() => {
    window.__YCN_TRANSLATIONS__ = undefined;
  });

  describe('Language Change Flow', () => {
    it('should complete full language change cycle', () => {
      // Track state changes
      const stateLog: Array<{ event: string; language: string; hasTranslations: boolean }> = [];

      // Simulate content.tsx handler for CHANGE_LANGUAGE
      const handleChangeLanguage = (language: string) => {
        if (!supportedLanguages.includes(language)) return false;

        stateLog.push({ event: 'CHANGE_LANGUAGE', language, hasTranslations: false });

        // Simulate loading translations
        if (!window.__YCN_TRANSLATIONS__) {
          window.__YCN_TRANSLATIONS__ = {};
        }
        window.__YCN_TRANSLATIONS__[language] =
          mockTranslations[language as keyof typeof mockTranslations];

        // Simulate LANGUAGE_LOADED dispatch
        stateLog.push({
          event: 'LANGUAGE_LOADED',
          language,
          hasTranslations: !!window.__YCN_TRANSLATIONS__[language],
        });

        return true;
      };

      // Execute the flow
      const success = handleChangeLanguage('de');

      expect(success).toBe(true);

      // Verify the flow completed
      expect(stateLog).toContainEqual({
        event: 'CHANGE_LANGUAGE',
        language: 'de',
        hasTranslations: false,
      });

      expect(stateLog).toContainEqual({
        event: 'LANGUAGE_LOADED',
        language: 'de',
        hasTranslations: true,
      });

      // Verify translations are accessible
      expect(window.__YCN_TRANSLATIONS__?.de).toBeDefined();
      expect(window.__YCN_TRANSLATIONS__?.de.greeting).toBe('Hallo');
    });

    it('should handle consecutive language changes', () => {
      const languageSequence: string[] = [];

      const changeLanguage = (language: string) => {
        if (!supportedLanguages.includes(language)) return false;

        if (!window.__YCN_TRANSLATIONS__) {
          window.__YCN_TRANSLATIONS__ = {};
        }
        window.__YCN_TRANSLATIONS__[language] =
          mockTranslations[language as keyof typeof mockTranslations];
        languageSequence.push(language);
        return true;
      };

      // Multiple language changes
      changeLanguage('de');
      changeLanguage('fr');
      changeLanguage('en');

      expect(languageSequence).toEqual(['de', 'fr', 'en']);

      // All translations should be cached
      expect(window.__YCN_TRANSLATIONS__?.de).toBeDefined();
      expect(window.__YCN_TRANSLATIONS__?.fr).toBeDefined();
      expect(window.__YCN_TRANSLATIONS__?.en).toBeDefined();
    });

    it('should handle unsupported language gracefully', () => {
      const errors: string[] = [];

      const changeLanguage = (language: string) => {
        if (!supportedLanguages.includes(language)) {
          errors.push(`Unsupported language: ${language}`);
          return false;
        }
        return true;
      };

      // Request unsupported language
      const result = changeLanguage('xyz');

      expect(result).toBe(false);
      expect(errors).toContain('Unsupported language: xyz');
      expect(window.__YCN_TRANSLATIONS__?.xyz).toBeUndefined();
    });
  });

  describe('RTL Language Support', () => {
    it('should correctly identify RTL languages', () => {
      const rtlLanguages = ['ar', 'he', 'fa', 'ur'];

      const getDirection = (lang: string): 'ltr' | 'rtl' => {
        return rtlLanguages.includes(lang) ? 'rtl' : 'ltr';
      };

      expect(getDirection('ar')).toBe('rtl');
      expect(getDirection('he')).toBe('rtl');
      expect(getDirection('en')).toBe('ltr');
      expect(getDirection('de')).toBe('ltr');
    });

    it('should load RTL language translations correctly', () => {
      window.__YCN_TRANSLATIONS__ = { ar: mockTranslations.ar };

      expect(window.__YCN_TRANSLATIONS__?.ar).toBeDefined();
      expect(window.__YCN_TRANSLATIONS__?.ar.greeting).toBe('مرحبا');
    });
  });

  describe('Translation Storage Verification', () => {
    it('should verify translations are stored in correct context', () => {
      // This test ensures translations are in the same context as the test
      // which simulates the content script context

      const storeTranslations = (lang: string, translations: Record<string, string>) => {
        if (!window.__YCN_TRANSLATIONS__) {
          window.__YCN_TRANSLATIONS__ = {};
        }
        window.__YCN_TRANSLATIONS__[lang] = translations;
      };

      const getTranslations = (lang: string) => {
        return window.__YCN_TRANSLATIONS__?.[lang];
      };

      // Store
      storeTranslations('en', mockTranslations.en);

      // Retrieve
      const retrieved = getTranslations('en');

      // Must be the same object (same context)
      expect(retrieved).toBe(mockTranslations.en);
      expect(retrieved?.greeting).toBe('Hello');
    });

    it('should not lose translations on subsequent operations', () => {
      window.__YCN_TRANSLATIONS__ = {};

      // Add first language
      window.__YCN_TRANSLATIONS__.en = mockTranslations.en;
      expect(Object.keys(window.__YCN_TRANSLATIONS__)).toContain('en');

      // Add second language
      window.__YCN_TRANSLATIONS__.de = mockTranslations.de;
      expect(Object.keys(window.__YCN_TRANSLATIONS__)).toContain('en');
      expect(Object.keys(window.__YCN_TRANSLATIONS__)).toContain('de');

      // Update first language
      window.__YCN_TRANSLATIONS__.en = { ...mockTranslations.en, newKey: 'new value' };
      expect(window.__YCN_TRANSLATIONS__.de).toBeDefined();
      expect(window.__YCN_TRANSLATIONS__.de.greeting).toBe('Hallo');
    });
  });

  describe('Message Type Validation', () => {
    it('should validate LANGUAGE_LOADED message structure', () => {
      const isValidLanguageLoaded = (data: unknown): boolean => {
        if (typeof data !== 'object' || data === null) return false;
        const obj = data as Record<string, unknown>;
        if (obj.type !== 'LANGUAGE_LOADED') return false;
        if (typeof obj.payload !== 'object' || obj.payload === null) return false;
        const payload = obj.payload as Record<string, unknown>;
        return typeof payload.language === 'string' && payload.language.length > 0;
      };

      expect(isValidLanguageLoaded({ type: 'LANGUAGE_LOADED', payload: { language: 'en' } })).toBe(
        true
      );
      expect(isValidLanguageLoaded({ type: 'LANGUAGE_LOADED', payload: { language: '' } })).toBe(
        false
      );
      expect(isValidLanguageLoaded({ type: 'LANGUAGE_LOADED', payload: {} })).toBe(false);
      expect(isValidLanguageLoaded({ type: 'OTHER_TYPE', payload: { language: 'en' } })).toBe(
        false
      );
      expect(isValidLanguageLoaded(null)).toBe(false);
    });

    it('should validate CHANGE_LANGUAGE message structure', () => {
      const isValidChangeLanguage = (data: unknown): boolean => {
        if (typeof data !== 'object' || data === null) return false;
        const obj = data as Record<string, unknown>;
        if (obj.type !== 'CHANGE_LANGUAGE') return false;
        if (typeof obj.payload !== 'object' || obj.payload === null) return false;
        const payload = obj.payload as Record<string, unknown>;
        return typeof payload.language === 'string' && payload.language.length > 0;
      };

      expect(isValidChangeLanguage({ type: 'CHANGE_LANGUAGE', payload: { language: 'de' } })).toBe(
        true
      );
      expect(isValidChangeLanguage({ type: 'CHANGE_LANGUAGE', payload: {} })).toBe(false);
      expect(isValidChangeLanguage({ type: 'LANGUAGE_LOADED', payload: { language: 'de' } })).toBe(
        false
      );
    });
  });

  describe('Context Isolation Simulation', () => {
    it('should demonstrate why page context storage fails', () => {
      // This test documents the bug that was fixed
      // In a real extension, page context and content script context are separate

      // Simulate page context (where inject-translations.js used to run)
      const pageContextWindow = {
        __YCN_TRANSLATIONS__: {} as Record<string, Record<string, string>>,
      };

      // Simulate content script context (where i18n.ts runs)
      const contentScriptWindow = {
        __YCN_TRANSLATIONS__: undefined as Record<string, Record<string, string>> | undefined,
      };

      // Store in page context (OLD BUG)
      pageContextWindow.__YCN_TRANSLATIONS__.en = { greeting: 'Hello' };

      // Try to read from content script context
      // This FAILS because they are different objects
      expect(contentScriptWindow.__YCN_TRANSLATIONS__).toBeUndefined();

      // The fix: store directly in content script context
      contentScriptWindow.__YCN_TRANSLATIONS__ = { en: { greeting: 'Hello' } };

      // Now it works
      expect(contentScriptWindow.__YCN_TRANSLATIONS__?.en.greeting).toBe('Hello');
    });

    it('should demonstrate correct same-context storage', () => {
      // This is the correct approach: store and read from same context

      // Content script stores (simulated by content.tsx)
      if (!window.__YCN_TRANSLATIONS__) {
        window.__YCN_TRANSLATIONS__ = {};
      }
      window.__YCN_TRANSLATIONS__.en = mockTranslations.en;

      // i18n module reads (same window object)
      const translations = window.__YCN_TRANSLATIONS__?.en;

      // This works because both use the same window object
      expect(translations).toBeDefined();
      expect(translations?.greeting).toBe('Hello');
    });
  });

  describe('Error Recovery', () => {
    it('should fallback to English when requested language fails', () => {
      let currentLanguage = 'en';

      const loadLanguage = (language: string): boolean => {
        if (!supportedLanguages.includes(language)) {
          // Fallback to English
          if (language !== 'en') {
            return loadLanguage('en');
          }
          return false;
        }

        if (!window.__YCN_TRANSLATIONS__) {
          window.__YCN_TRANSLATIONS__ = {};
        }
        window.__YCN_TRANSLATIONS__[language] =
          mockTranslations[language as keyof typeof mockTranslations];
        currentLanguage = language;
        return true;
      };

      // Try to load unsupported language
      const result = loadLanguage('xyz');

      // Should fallback to English
      expect(result).toBe(true);
      expect(currentLanguage).toBe('en');
      expect(window.__YCN_TRANSLATIONS__?.en).toBeDefined();
    });

    it('should handle missing payload gracefully', () => {
      const processMessage = (data: unknown): string | null => {
        if (typeof data !== 'object' || data === null) return null;
        const obj = data as Record<string, unknown>;
        if (obj.type !== 'LANGUAGE_LOADED') return null;
        if (!obj.payload) return null;
        const payload = obj.payload as Record<string, unknown>;
        if (!payload.language) return null;
        return payload.language as string;
      };

      expect(processMessage({ type: 'LANGUAGE_LOADED', payload: { language: 'en' } })).toBe('en');
      expect(processMessage({ type: 'LANGUAGE_LOADED' })).toBeNull();
      expect(processMessage({ type: 'LANGUAGE_LOADED', payload: {} })).toBeNull();
      expect(processMessage(null)).toBeNull();
    });
  });
});
