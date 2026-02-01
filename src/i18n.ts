import i18n, { InitOptions } from 'i18next';
import { initReactI18next } from 'react-i18next';
import HttpBackend from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';
import { isLocalEnvironment, languageOptions } from './features/shared/utils/appConstants';

const supportedLanguages = languageOptions.map((option) => option.value);

const languageDirections: Record<string, 'ltr' | 'rtl'> = {
  ar: 'rtl',
  he: 'rtl',
  fa: 'rtl',
  ur: 'rtl',
  prs: 'rtl', // Dari
  ps: 'rtl', // Pashto
  default: 'ltr',
};

type TranslationData = Record<string, string>;

declare global {
  interface Window {
    __YCN_TRANSLATIONS__?: Record<string, TranslationData>;
  }
}

interface Resources {
  [locale: string]: {
    [namespace: string]: TranslationData;
  };
}

const loadLocaleFromDOM = (locale: string): Resources | null => {
  const namespace = 'translation';

  if (window.__YCN_TRANSLATIONS__ && window.__YCN_TRANSLATIONS__[locale]) {
    return {
      [locale]: {
        [namespace]: window.__YCN_TRANSLATIONS__[locale],
      },
    };
  }

  const script = document.getElementById(`locale-${locale}`);
  if (script && script.textContent) {
    try {
      const parsed = JSON.parse(script.textContent) as TranslationData;
      return {
        [locale]: {
          [namespace]: parsed,
        },
      };
    } catch {
      return null;
    }
  }

  return null;
};

const getLoadPath = (): string | undefined => {
  if (isLocalEnvironment()) {
    return '/locales/{{lng}}/{{ns}}.json';
  }
  return undefined;
};

const i18nConfig: InitOptions = {
  fallbackLng: 'en',
  lng: 'en',
  debug: false,
  interpolation: {
    escapeValue: false,
  },
  backend: {
    loadPath: getLoadPath(),
  },
  supportedLngs: supportedLanguages,
};

const initialResources = loadLocaleFromDOM(i18n.language || 'en');

if (initialResources) {
  i18nConfig.resources = initialResources;
  if (i18nConfig.backend && typeof i18nConfig.backend === 'object') {
    (i18nConfig.backend as { loadPath?: string }).loadPath = undefined;
  }
}

if (isLocalEnvironment()) {
  i18n.use(HttpBackend);
}

i18n.use(LanguageDetector).use(initReactI18next).init(i18nConfig);

window.addEventListener('message', (event: MessageEvent) => {
  if (event.source !== window) return;

  const { type, payload } = event.data || { /* no-op */ };

  if (type === 'LANGUAGE_LOADED') {
    if (!payload || !payload.language) {
      return;
    }

    const { language } = payload;

    if (!supportedLanguages.includes(language)) {
      return;
    }

    const resources = loadLocaleFromDOM(language);
    if (resources) {
      i18n.addResources(language, 'translation', resources[language]['translation']);
      i18n.changeLanguage(language);
    }
  }
});

export const getLanguageDirection = (language: string): 'ltr' | 'rtl' => {
  return languageDirections[language] || languageDirections.default;
};

export default i18n;
