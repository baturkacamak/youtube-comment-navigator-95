import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import HttpBackend from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';
import { isLocalEnvironment, languageOptions } from './features/shared/utils/appConstants'; // Import environment check

const supportedLanguages = languageOptions.map((option) => option.value);

const languageDirections: { [key: string]: 'ltr' | 'rtl' } = {
  ar: 'rtl',
  he: 'rtl',
  fa: 'rtl',
  ur: 'rtl',
  default: 'ltr',
};

// Extend Window interface to include our global translation object
declare global {
  interface Window {
    __YCN_TRANSLATIONS__?: {
      [locale: string]: any;
    };
  }
}

interface Resources {
  [locale: string]: {
    [namespace: string]: any;
  };
}

const loadLocaleFromDOM = (locale: string): Resources | null => {
  const namespace = 'translation'; // Adjust if you use multiple namespaces

  // Priority 1: Check Global Variable (Most Reliable)
  if (window.__YCN_TRANSLATIONS__ && window.__YCN_TRANSLATIONS__[locale]) {
    console.log(`[YCN-i18n] Loaded locale '${locale}' from window.__YCN_TRANSLATIONS__`);
    return {
      [locale]: {
        [namespace]: window.__YCN_TRANSLATIONS__[locale],
      },
    };
  }

  // Priority 2: Check Script Tag (Legacy)
  const script = document.getElementById(`locale-${locale}`);
  if (script && script.textContent) {
    console.log(`[YCN-i18n] Loaded locale '${locale}' from DOM script tag`);
    return {
      [locale]: {
        [namespace]: JSON.parse(script.textContent),
      },
    };
  }

  // Changing to debug as this often happens initially before the LANGUAGE_LOADED event fires
  console.debug(`[YCN-i18n] Failed to load locale '${locale}' from DOM or Global Variable.`);
  return null;
};

const getLoadPath = (): string | null => {
  if (isLocalEnvironment()) {
    return '/locales/{{lng}}/{{ns}}.json';
  }
  return null; // In production, we will use the injected resources
};

// Track missing keys to prevent duplicate logs
const missingKeys = new Set<string>();

// Create the configuration object dynamically
const i18nConfig: any = {
  fallbackLng: 'en',
  lng: 'en',
  debug: false, // Disable verbose default logging
  saveMissing: true, // Enable missing key handler
  missingKeyHandler: (lng: string, ns: string, key: string) => {
    if (isLocalEnvironment()) {
      const uniqueKey = `${lng}:${ns}:${key}`;
      if (!missingKeys.has(uniqueKey)) {
        missingKeys.add(uniqueKey);
        // Log with a cleaner format
        console.warn(`[YCN-i18n] Missing key: "${key}" in language: "${lng}"`);
      }
    }
  },
  interpolation: {
    escapeValue: false,
  },
  backend: {
    loadPath: getLoadPath() || undefined, // Handle the null case
  },
  supportedLngs: supportedLanguages,
};

// Always try to load resources from DOM first
// Default to 'en' since that's what content.js injects initially, and i18n.language is undefined before init
const initialResources = loadLocaleFromDOM(i18n.language || 'en');

if (isLocalEnvironment()) {
  console.log('[YCN-i18n] Environment is LOCAL/DEV');
  console.log(`[YCN-i18n] Attempting to load locale from DOM for: ${i18n.language || 'en'}`);
  const scriptEl = document.getElementById(`locale-${i18n.language || 'en'}`);
  console.log(`[YCN-i18n] Script element found? ${!!scriptEl}`);
  if (scriptEl) {
    console.log(`[YCN-i18n] Script content length: ${scriptEl.textContent?.length}`);
  }
  console.log(`[YCN-i18n] Initial resources loaded? ${!!initialResources}`);
}

if (initialResources) {
  i18nConfig.resources = initialResources;
  // If we have resources, disable the backend fetch to avoid 404s
  if (i18nConfig.backend) {
    i18nConfig.backend.loadPath = undefined;
  }
}

// Only use HttpBackend in local environment to avoid 404s/parsing errors in production
if (isLocalEnvironment()) {
  i18n.use(HttpBackend);
}

i18n.use(LanguageDetector).use(initReactI18next).init(i18nConfig);

// Listen for the language change and reload the necessary resources
window.addEventListener('message', (event: MessageEvent) => {
  if (event.source !== window) return; // Only accept messages from the same window

  const { type, payload } = event.data;
  if (type === 'LANGUAGE_LOADED') {
    const { language } = payload;
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
