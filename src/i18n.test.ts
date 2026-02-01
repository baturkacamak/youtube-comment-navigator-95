import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock i18next before importing i18n
vi.mock('i18next', () => {
  const mockI18n = {
    language: 'en',
    use: vi.fn().mockReturnThis(),
    init: vi.fn().mockResolvedValue(undefined),
    addResources: vi.fn(),
    changeLanguage: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
    off: vi.fn(),
  };
  return { default: mockI18n };
});

vi.mock('react-i18next', () => ({
  initReactI18next: { type: '3rdParty', init: vi.fn() },
}));

vi.mock('i18next-http-backend', () => ({
  default: vi.fn(),
}));

vi.mock('i18next-browser-languagedetector', () => ({
  default: vi.fn(),
}));

vi.mock('./features/shared/utils/appConstants', () => ({
  isLocalEnvironment: vi.fn(() => false),
  languageOptions: [
    { value: 'en', label: 'English' },
    { value: 'de', label: 'Deutsch' },
    { value: 'fr', label: 'Français' },
    { value: 'ar', label: 'العربية' },
    { value: 'he', label: 'עברית' },
  ],
}));

describe('i18n', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset window.__YCN_TRANSLATIONS__
    window.__YCN_TRANSLATIONS__ = undefined;
  });

  describe('getLanguageDirection', () => {
    it('should return rtl for Arabic', async () => {
      const { getLanguageDirection } = await import('./i18n');
      expect(getLanguageDirection('ar')).toBe('rtl');
    });

    it('should return rtl for Hebrew', async () => {
      const { getLanguageDirection } = await import('./i18n');
      expect(getLanguageDirection('he')).toBe('rtl');
    });

    it('should return ltr for English', async () => {
      const { getLanguageDirection } = await import('./i18n');
      expect(getLanguageDirection('en')).toBe('ltr');
    });

    it('should return ltr for German', async () => {
      const { getLanguageDirection } = await import('./i18n');
      expect(getLanguageDirection('de')).toBe('ltr');
    });

    it('should return ltr for unknown languages', async () => {
      const { getLanguageDirection } = await import('./i18n');
      expect(getLanguageDirection('unknown')).toBe('ltr');
    });
  });

  describe('window.__YCN_TRANSLATIONS__ storage', () => {
    it('should be accessible in the same context where it was set', () => {
      const mockTranslations = {
        greeting: 'Hello',
        farewell: 'Goodbye',
      };

      window.__YCN_TRANSLATIONS__ = {
        en: mockTranslations,
      };

      expect(window.__YCN_TRANSLATIONS__).toBeDefined();
      expect(window.__YCN_TRANSLATIONS__?.en).toEqual(mockTranslations);
    });

    it('should allow adding multiple languages', () => {
      window.__YCN_TRANSLATIONS__ = { /* no-op */ };

      window.__YCN_TRANSLATIONS__.en = { greeting: 'Hello' };
      window.__YCN_TRANSLATIONS__.de = { greeting: 'Hallo' };
      window.__YCN_TRANSLATIONS__.fr = { greeting: 'Bonjour' };

      expect(Object.keys(window.__YCN_TRANSLATIONS__)).toHaveLength(3);
      expect(window.__YCN_TRANSLATIONS__.en.greeting).toBe('Hello');
      expect(window.__YCN_TRANSLATIONS__.de.greeting).toBe('Hallo');
      expect(window.__YCN_TRANSLATIONS__.fr.greeting).toBe('Bonjour');
    });

    it('should allow overwriting existing translations', () => {
      window.__YCN_TRANSLATIONS__ = {
        en: { greeting: 'Hi' },
      };

      window.__YCN_TRANSLATIONS__.en = { greeting: 'Hello', farewell: 'Bye' };

      expect(window.__YCN_TRANSLATIONS__.en.greeting).toBe('Hello');
      expect(window.__YCN_TRANSLATIONS__.en.farewell).toBe('Bye');
    });
  });

  describe('loadLocaleFromDOM fallback', () => {
    let messageHandler: ((event: MessageEvent) => void) | null = null;
    const originalAddEventListener = window.addEventListener;

    beforeEach(() => {
      // Mock addEventListener to capture the handler
      window.addEventListener = vi.fn((event: string, handler: EventListener) => {
        if (event === 'message') {
          messageHandler = handler as (event: MessageEvent) => void;
        }
      }) as typeof window.addEventListener;
    });

    afterEach(() => {
      window.addEventListener = originalAddEventListener;
      messageHandler = null;
    });

    it('should load translations from script tag if global var is missing', async () => {
      vi.resetModules();
      window.__YCN_TRANSLATIONS__ = undefined;

      const mockScript = document.createElement('script');
      mockScript.id = 'locale-fr';
      mockScript.type = 'application/json'; // Prevent jsdom from executing it
      mockScript.textContent = JSON.stringify({ greeting: 'Bonjour' });
      document.body.appendChild(mockScript);

      const i18n = (await import('./i18n')).default;

      // Simulate the "LANGUAGE_LOADED" event
      const event = new MessageEvent('message', {
        data: { type: 'LANGUAGE_LOADED', payload: { language: 'fr' } },
        source: window,
      });

      if (messageHandler) {
        messageHandler(event);
        expect(i18n.addResources).toHaveBeenCalledWith('fr', 'translation', {
          greeting: 'Bonjour',
        });
      } else {
        throw new Error('Message handler was not registered');
      }

      document.body.removeChild(mockScript);
    });

    it('should handle malformed JSON in script tag', async () => {
      vi.resetModules();
      window.__YCN_TRANSLATIONS__ = undefined;

      const mockScript = document.createElement('script');
      mockScript.id = 'locale-de';
      mockScript.type = 'application/json'; // Prevent jsdom from executing it
      mockScript.textContent = '{ bad json }';
      document.body.appendChild(mockScript);

      const i18n = (await import('./i18n')).default;

      const event = new MessageEvent('message', {
        data: { type: 'LANGUAGE_LOADED', payload: { language: 'de' } },
        source: window,
      });

      if (messageHandler) {
        messageHandler(event);
        // Should catch error and NOT call addResources
        expect(i18n.addResources).not.toHaveBeenCalledWith(
          'de',
          expect.any(String),
          expect.any(Object)
        );
      } else {
        throw new Error('Message handler was not registered');
      }

      document.body.removeChild(mockScript);
    });
  });

  describe('Environment Configuration', () => {
    it('should configure backend loadPath in local environment', async () => {
      vi.resetModules();
      // Mock isLocalEnvironment to return true
      vi.mocked(
        await import('./features/shared/utils/appConstants')
      ).isLocalEnvironment.mockReturnValue(true);

      // We need to spy on i18n.init to check the config
      // But we need to ensure the module re-evaluates

      const i18n = (await import('./i18n')).default;

      expect(i18n.init).toHaveBeenCalledWith(
        expect.objectContaining({
          backend: expect.objectContaining({
            loadPath: '/locales/{{lng}}/{{ns}}.json',
          }),
        })
      );
    });

    it('should remove backend loadPath if initial resources are found', async () => {
      vi.resetModules();
      vi.mocked(
        await import('./features/shared/utils/appConstants')
      ).isLocalEnvironment.mockReturnValue(true);

      // Pre-load resources via global var
      window.__YCN_TRANSLATIONS__ = {
        en: { greeting: 'Hello' },
      };

      const i18n = (await import('./i18n')).default;

      // When resources are present, the code explicitly removes backend.loadPath
      expect(i18n.init).toHaveBeenCalledWith(
        expect.objectContaining({
          resources: expect.anything(),
          backend: expect.objectContaining({
            loadPath: undefined,
          }),
        })
      );
    });
  });
});

describe('LANGUAGE_LOADED event handling', () => {
  let messageHandler: ((event: MessageEvent) => void) | null = null;
  const originalAddEventListener = window.addEventListener;

  beforeEach(() => {
    vi.clearAllMocks();
    window.__YCN_TRANSLATIONS__ = undefined;

    // Capture the message event handler
    window.addEventListener = vi.fn((event: string, handler: EventListener) => {
      if (event === 'message') {
        messageHandler = handler as (event: MessageEvent) => void;
      }
    }) as typeof window.addEventListener;
  });

  afterEach(() => {
    window.addEventListener = originalAddEventListener;
    messageHandler = null;
  });

  it('should register a message event listener', async () => {
    // Re-import to trigger the module initialization
    vi.resetModules();
    await import('./i18n');

    expect(window.addEventListener).toHaveBeenCalledWith('message', expect.any(Function));
  });

  it('should process LANGUAGE_LOADED events from same window', async () => {
    vi.resetModules();

    // Set up translations before importing
    window.__YCN_TRANSLATIONS__ = {
      de: { greeting: 'Hallo' },
    };

    const i18n = (await import('./i18n')).default;

    // Get the message handler
    const addEventListenerCalls = vi.mocked(window.addEventListener).mock.calls;
    const messageCall = addEventListenerCalls.find((call) => call[0] === 'message');
    if (messageCall) {
      messageHandler = messageCall[1] as (event: MessageEvent) => void;
    }

    if (messageHandler) {
      // Simulate LANGUAGE_LOADED event
      const event = new MessageEvent('message', {
        data: { type: 'LANGUAGE_LOADED', payload: { language: 'de' } },
        source: window,
      });

      messageHandler(event);

      expect(i18n.addResources).toHaveBeenCalledWith('de', 'translation', { greeting: 'Hallo' });
      expect(i18n.changeLanguage).toHaveBeenCalledWith('de');
    }
  });

  it('should ignore LANGUAGE_LOADED events from different sources', async () => {
    vi.resetModules();

    window.__YCN_TRANSLATIONS__ = {
      de: { greeting: 'Hallo' },
    };

    const i18n = (await import('./i18n')).default;

    const addEventListenerCalls = vi.mocked(window.addEventListener).mock.calls;
    const messageCall = addEventListenerCalls.find((call) => call[0] === 'message');
    if (messageCall) {
      messageHandler = messageCall[1] as (event: MessageEvent) => void;
    }

    if (messageHandler) {
      // Simulate event from different source
      const event = new MessageEvent('message', {
        data: { type: 'LANGUAGE_LOADED', payload: { language: 'de' } },
        source: null, // Different source
      });

      messageHandler(event);

      expect(i18n.addResources).not.toHaveBeenCalled();
      expect(i18n.changeLanguage).not.toHaveBeenCalled();
    }
  });

  it('should ignore events with invalid payload', async () => {
    vi.resetModules();

    const i18n = (await import('./i18n')).default;

    const addEventListenerCalls = vi.mocked(window.addEventListener).mock.calls;
    const messageCall = addEventListenerCalls.find((call) => call[0] === 'message');
    if (messageCall) {
      messageHandler = messageCall[1] as (event: MessageEvent) => void;
    }

    if (messageHandler) {
      // Event without language
      const event1 = new MessageEvent('message', {
        data: { type: 'LANGUAGE_LOADED', payload: { /* no-op */ } },
        source: window,
      });
      messageHandler(event1);

      // Event without payload
      const event2 = new MessageEvent('message', {
        data: { type: 'LANGUAGE_LOADED' },
        source: window,
      });
      messageHandler(event2);

      expect(i18n.addResources).not.toHaveBeenCalled();
    }
  });

  it('should ignore unsupported languages', async () => {
    vi.resetModules();

    window.__YCN_TRANSLATIONS__ = {
      xyz: { greeting: 'Test' },
    };

    const i18n = (await import('./i18n')).default;

    const addEventListenerCalls = vi.mocked(window.addEventListener).mock.calls;
    const messageCall = addEventListenerCalls.find((call) => call[0] === 'message');
    if (messageCall) {
      messageHandler = messageCall[1] as (event: MessageEvent) => void;
    }

    if (messageHandler) {
      const event = new MessageEvent('message', {
        data: { type: 'LANGUAGE_LOADED', payload: { language: 'xyz' } },
        source: window,
      });

      messageHandler(event);

      expect(i18n.changeLanguage).not.toHaveBeenCalled();
    }
  });

  it('should ignore events when translations are not available', async () => {
    vi.resetModules();

    // No translations set
    window.__YCN_TRANSLATIONS__ = { /* no-op */ };

    const i18n = (await import('./i18n')).default;

    const addEventListenerCalls = vi.mocked(window.addEventListener).mock.calls;
    const messageCall = addEventListenerCalls.find((call) => call[0] === 'message');
    if (messageCall) {
      messageHandler = messageCall[1] as (event: MessageEvent) => void;
    }

    if (messageHandler) {
      const event = new MessageEvent('message', {
        data: { type: 'LANGUAGE_LOADED', payload: { language: 'de' } },
        source: window,
      });

      messageHandler(event);

      expect(i18n.addResources).not.toHaveBeenCalled();
    }
  });
});
