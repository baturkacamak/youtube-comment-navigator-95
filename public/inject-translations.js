(function () {
    console.info('[YCN-i18n-inject] Translation injection script loaded in page context');
    console.debug('[YCN-i18n-inject] Chrome APIs available:', {
        hasChromeRuntime: typeof chrome !== 'undefined' && typeof chrome.runtime !== 'undefined',
        hasChromeI18n: typeof chrome !== 'undefined' && typeof chrome.i18n !== 'undefined'
    });

    /**
     * This script runs in the PAGE CONTEXT (not content script context)
     * It receives translations from the content script via postMessage
     * and makes them available in window.__YCN_TRANSLATIONS__
     */

    // Initialize the global translation object
    if (!window.__YCN_TRANSLATIONS__) {
        window.__YCN_TRANSLATIONS__ = {};
        console.debug('[YCN-i18n-inject] Initialized window.__YCN_TRANSLATIONS__');
    } else {
        console.debug('[YCN-i18n-inject] window.__YCN_TRANSLATIONS__ already exists');
    }

    // Listen for translation data from content script
    window.addEventListener('message', (event) => {
        // Only accept messages from same window
        if (event.source !== window) {
            return;
        }

        const { type, payload } = event.data;

        if (type === 'YCN_INJECT_TRANSLATIONS') {
            console.debug('[YCN-i18n-inject] Received translation injection request:', {
                language: payload?.language,
                hasTranslations: !!payload?.translations,
                translationKeys: payload?.translations ? Object.keys(payload.translations).length : 0
            });

            try {
                if (!payload || !payload.language || !payload.translations) {
                    console.error('[YCN-i18n-inject] Invalid payload received:', payload);
                    return;
                }

                const { language, translations } = payload;

                // Inject the translations
                window.__YCN_TRANSLATIONS__[language] = translations;
                console.info(`[YCN-i18n-inject] Successfully injected translations for language: ${language}`);
                console.debug(`[YCN-i18n-inject] Available languages:`, Object.keys(window.__YCN_TRANSLATIONS__));

                // Notify that translations are loaded and ready
                window.postMessage({
                    type: 'LANGUAGE_LOADED',
                    payload: { language }
                }, '*');

                console.info(`[YCN-i18n-inject] Sent LANGUAGE_LOADED notification for: ${language}`);

            } catch (error) {
                console.error('[YCN-i18n-inject] Error processing translation injection:', error);
            }
        } else if (type === 'YCN_REQUEST_CURRENT_LANGUAGE') {
            // Content script is asking what languages are available
            const availableLanguages = Object.keys(window.__YCN_TRANSLATIONS__ || {});
            console.debug('[YCN-i18n-inject] Current language request - available languages:', availableLanguages);
            
            window.postMessage({
                type: 'YCN_CURRENT_LANGUAGE_RESPONSE',
                payload: { availableLanguages }
            }, '*');
        }
    });

    console.info('[YCN-i18n-inject] Translation injection listener initialized and ready');

})();
