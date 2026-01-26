import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import HttpBackend from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';
import {isLocalEnvironment, languageOptions} from './features/shared/utils/appConstants'; // Import environment check

const supportedLanguages = languageOptions.map(option => option.value);

const languageDirections: { [key: string]: 'ltr' | 'rtl' } = {
    ar: 'rtl',
    he: 'rtl',
    fa: 'rtl',
    ur: 'rtl',
    default: 'ltr'
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
    console.debug(`[YCN-i18n] Attempting to load locale: ${locale}`);
    const namespace = 'translation'; // Adjust if you use multiple namespaces
    
    // Priority 1: Check Global Variable (Most Reliable)
    console.debug(`[YCN-i18n] Checking window.__YCN_TRANSLATIONS__:`, {
        exists: !!window.__YCN_TRANSLATIONS__,
        availableLocales: window.__YCN_TRANSLATIONS__ ? Object.keys(window.__YCN_TRANSLATIONS__) : [],
        hasRequestedLocale: !!(window.__YCN_TRANSLATIONS__ && window.__YCN_TRANSLATIONS__[locale])
    });
    
    if (window.__YCN_TRANSLATIONS__ && window.__YCN_TRANSLATIONS__[locale]) {
        const translationKeys = Object.keys(window.__YCN_TRANSLATIONS__[locale]).length;
        console.info(`[YCN-i18n] ✓ Loaded locale '${locale}' from window.__YCN_TRANSLATIONS__ (${translationKeys} keys)`);
        return {
            [locale]: {
                [namespace]: window.__YCN_TRANSLATIONS__[locale]
            }
        };
    }

    // Priority 2: Check Script Tag (Legacy)
    const script = document.getElementById(`locale-${locale}`);
    console.debug(`[YCN-i18n] Checking legacy DOM script tag for locale-${locale}:`, !!script);
    
    if (script && script.textContent) {
        console.info(`[YCN-i18n] ✓ Loaded locale '${locale}' from DOM script tag`);
        try {
            return {
                [locale]: {
                    [namespace]: JSON.parse(script.textContent)
                }
            };
        } catch (error) {
            console.error(`[YCN-i18n] Failed to parse locale from script tag:`, error);
        }
    }
    
    console.warn(`[YCN-i18n] ✗ Failed to load locale '${locale}' from any source`);
    return null;
};

const getLoadPath = (): string | null => {
    if (isLocalEnvironment()) {
        return '/locales/{{lng}}/{{ns}}.json';
    }
    return null; // In production, we will use the injected resources
};

// Get user's preferred language from browser or Chrome i18n
const getUserLanguage = (): string => {
    console.debug('[YCN-i18n] Detecting user language...');
    try {
        // Try Chrome extension API first (works in extension context)
        if (typeof chrome !== 'undefined' && chrome.i18n) {
            const lang = chrome.i18n.getUILanguage().split('-')[0];
            console.info(`[YCN-i18n] User language from Chrome API: ${lang}`);
            return lang;
        }
    } catch (error) {
        console.warn('[YCN-i18n] Chrome API not available, falling back to navigator.language:', error);
    }
    const lang = navigator.language?.split('-')[0] || 'en';
    console.info(`[YCN-i18n] User language from navigator: ${lang}`);
    return lang;
};

const userLanguage = getUserLanguage();

// Create the configuration object dynamically
const i18nConfig: any = {
    fallbackLng: 'en',
    lng: userLanguage,
    debug: isLocalEnvironment(),
    interpolation: {
        escapeValue: false,
    },
    backend: {
        loadPath: getLoadPath() || undefined, // Handle the null case
    },
    supportedLngs: supportedLanguages,
};

console.info('[YCN-i18n] i18n configuration:', {
    language: i18nConfig.lng,
    fallback: i18nConfig.fallbackLng,
    supportedCount: supportedLanguages.length,
    debug: i18nConfig.debug,
    environment: isLocalEnvironment() ? 'LOCAL/DEV' : 'PRODUCTION'
});

// Try to load initial resources from DOM
// Note: Translations might not be available yet if inject-translations.js hasn't run
const initialResources = loadLocaleFromDOM(userLanguage);

if (initialResources) {
    console.info(`[YCN-i18n] ✓ Initial resources loaded for '${userLanguage}'`);
    i18nConfig.resources = initialResources;
    // If we have resources, disable the backend fetch to avoid 404s
    if (i18nConfig.backend) {
        i18nConfig.backend.loadPath = undefined;
    }
} else {
    console.warn(`[YCN-i18n] ⚠ No initial resources found for '${userLanguage}', will retry when LANGUAGE_LOADED event fires`);
    // Try to load English as immediate fallback
    const fallbackResources = loadLocaleFromDOM('en');
    if (fallbackResources) {
        console.info('[YCN-i18n] ✓ Loaded English fallback resources');
        i18nConfig.resources = fallbackResources;
        if (i18nConfig.backend) {
            i18nConfig.backend.loadPath = undefined;
        }
    } else {
        console.error('[YCN-i18n] ✗ No fallback resources available either');
    }
}

// Flag to track if translations have been loaded
let translationsLoaded = false;

// Export a getter for the translations status
export const areTranslationsLoaded = (): boolean => translationsLoaded;

// Always initialize i18n immediately (required for React)
// But start with empty resources if none available yet
console.info('[YCN-i18n] Initializing i18next (required for React)...');
console.debug('[YCN-i18n] Initial configuration:', {
    language: i18nConfig.lng,
    hasResources: !!i18nConfig.resources,
    fallback: i18nConfig.fallbackLng
});

// Initialize i18n synchronously - React needs this immediately
i18n
    .use(HttpBackend)
    .use(LanguageDetector)
    .use(initReactI18next)
    .init(i18nConfig)
    .then(() => {
        console.info(`[YCN-i18n] ✓ i18next initialized`);
        console.info(`[YCN-i18n] Current language: ${i18n.language}`);
        console.info(`[YCN-i18n] Available languages: ${i18n.languages?.join(', ') || 'none'}`);
        if (initialResources) {
            translationsLoaded = true;
            console.info('[YCN-i18n] ✓ Initial resources available');
        } else {
            console.info('[YCN-i18n] ⚠ No initial resources, waiting for LANGUAGE_LOADED event');
        }
    })
    .catch((error) => {
        console.error('[YCN-i18n] ✗ Failed to initialize i18next:', error);
    });

// Listen for the language change and reload the necessary resources
console.info('[YCN-i18n] Setting up LANGUAGE_LOADED message listener...');
window.addEventListener('message', async (event: MessageEvent) => {
    if (event.source !== window) return; // Only accept messages from the same window

    const { type, payload } = event.data;
    
    if (type === 'LANGUAGE_LOADED') {
        console.info('[YCN-i18n] 📨 LANGUAGE_LOADED event received:', payload);
        
        if (!payload || !payload.language) {
            console.error('[YCN-i18n] Invalid LANGUAGE_LOADED payload:', payload);
            return;
        }
        
        const { language } = payload;
        console.debug(`[YCN-i18n] Loading resources for language: ${language}`);
        
        const resources = loadLocaleFromDOM(language);
        if (resources) {
            console.info(`[YCN-i18n] ✓ Resources loaded from DOM for language: ${language}`);
            
            try {
                console.debug(`[YCN-i18n] Adding resources to i18n instance`);
                
                // Add resources for this language
                i18n.addResources(language, 'translation', resources[language]['translation']);
                console.debug(`[YCN-i18n] Resources added successfully`);
                
                // Change to this language
                await i18n.changeLanguage(language);
                console.info(`[YCN-i18n] ✓ Language changed successfully to: ${language}`);
                
                // Mark translations as loaded
                translationsLoaded = true;
                console.info('[YCN-i18n] ✓ Translations fully loaded');
                
            } catch (error) {
                console.error('[YCN-i18n] ✗ Failed to add resources or change language:', error);
            }
        } else {
            console.error(`[YCN-i18n] ✗ Failed to load resources for language: ${language}`);
        }
    }
});

console.info('[YCN-i18n] ✓ Message listener ready');

export const getLanguageDirection = (language: string): 'ltr' | 'rtl' => {
    return languageDirections[language] || languageDirections.default;
};

export default i18n;
