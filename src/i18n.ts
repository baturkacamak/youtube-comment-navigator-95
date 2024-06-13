import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import HttpBackend from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';
import { supportedLanguages } from './utils/environmentVariables'; // Adjust the path as needed
import { isLocalEnvironment } from './utils/environmentVariables'; // Import environment check

const languageDirections: { [key: string]: 'ltr' | 'rtl' } = {
    ar: 'rtl',
    he: 'rtl',
    fa: 'rtl',
    ur: 'rtl',
    default: 'ltr'
};

interface Resources {
    [locale: string]: {
        [namespace: string]: any;
    };
}

const loadLocaleFromDOM = (locale: string): Resources | null => {
    const namespace = 'translation'; // Adjust if you use multiple namespaces
    const script = document.getElementById(`locale-${locale}`);
    if (script && script.textContent) {
        return {
            [locale]: {
                [namespace]: JSON.parse(script.textContent)
            }
        };
    }
    return null;
};

const getLoadPath = (): string | null => {
    if (isLocalEnvironment()) {
        return '/locales/{{lng}}/{{ns}}.json';
    }
    return null; // In production, we will use the injected resources
};

i18n
    .use(HttpBackend)
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        fallbackLng: 'en',
        lng: 'en',
        debug: isLocalEnvironment(),
        interpolation: {
            escapeValue: false,
        },
        backend: {
            loadPath: getLoadPath() || undefined, // Handle the null case
        },
        supportedLngs: supportedLanguages,
        resources: isLocalEnvironment() ? {} : loadLocaleFromDOM(i18n.language) || {}, // Load initial resources if available
    });

// Listen for the language change and reload the necessary resources
if (!isLocalEnvironment()) {
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
}

export const getLanguageDirection = (language: string): 'ltr' | 'rtl' => {
    return languageDirections[language] || languageDirections.default;
};

export default i18n;
