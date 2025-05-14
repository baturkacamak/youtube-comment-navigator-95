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

// Create the configuration object dynamically
const i18nConfig: any = {
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
};

// Only add resources key if not in local environment
if (!isLocalEnvironment()) {
    const initialResources = loadLocaleFromDOM(i18n.language);
    if (initialResources) {
        i18nConfig.resources = initialResources;
    }
}

i18n
    .use(HttpBackend)
    .use(LanguageDetector)
    .use(initReactI18next)
    .init(i18nConfig);

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
