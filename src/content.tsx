import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import store from './store/store';
import App from './App';
import './styles/index.css';
import './i18n';
import i18n, { getLanguageDirection } from './i18n';
import { isLocalEnvironment } from "./features/shared/utils/appConstants";
import reportWebVitals from './reportWebVitals';
import logger from './features/shared/utils/logger';

// --- Helper Classes ---

class DOMHelper {
    static createAppContainer(commentsSectionId: string, containerId: string): HTMLElement | null {
        const commentsSection = document.getElementById(commentsSectionId);
        if (!commentsSection) {
            return null;
        }

        // Check if already exists
        const existing = document.getElementById(containerId);
        if (existing) return existing;

        const newAppContainer = document.createElement('div');
        newAppContainer.id = containerId;
        newAppContainer.style.width = '100%';
        // Insert before comments
        if (commentsSection.parentNode) {
            commentsSection.parentNode.insertBefore(newAppContainer, commentsSection);
        }
        return newAppContainer;
    }

    static removeAppContainer(containerId: string) {
        const appContainer = document.getElementById(containerId);
        if (appContainer) {
            appContainer.remove();
        }
    }

    static isVideoWatchPage() {
        return window.location.pathname === '/watch' && new URLSearchParams(window.location.search).has('v');
    }
}

class PubSub {
    events: { [key: string]: Function[] };

    constructor() {
        this.events = {};
    }

    subscribe(event: string, callback: Function) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(callback);
    }

    publish(event: string, data: any) {
        if (this.events[event]) {
            this.events[event].forEach(callback => callback(data));
        }
    }
}

class URLChangeHandler {
    pubSub: PubSub;
    currentUrl: string;

    constructor(pubSub: PubSub) {
        this.pubSub = pubSub;
        this.currentUrl = this.getRelevantUrl(window.location.href);
        this.monitorUrlChange();
    }

    getRelevantUrl(url: string) {
        const urlObj = new URL(url);
        let baseUrl = `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`;
        const videoId = urlObj.searchParams.get('v');
        if (videoId) {
            baseUrl += `?v=${videoId}`;
        }
        return baseUrl;
    }

    async monitorUrlChange() {
        const handler = async () => {
            const newUrl = this.getRelevantUrl(window.location.href);
            if (this.currentUrl !== newUrl) {
                this.currentUrl = newUrl;
                this.pubSub.publish('urlchange', newUrl);
            }
        };

        setInterval(handler, 1000);
    }
}

// --- Main Logic ---

class YouTubeCommentNavigator {
    appContainerId = 'youtube-comment-navigator-app';
    commentsSectionId = 'comments';
    pubSub: PubSub;
    root: ReactDOM.Root | null = null;

    constructor(pubSub: PubSub) {
        this.pubSub = pubSub;
        this.pubSub.subscribe('urlchange', () => this.onUrlChange());
        this.setupInitialLoad();
    }

    checkAndInjectWithInterval(isUrlChanged = false) {
        const intervalId = setInterval(async () => {
            if (!DOMHelper.isVideoWatchPage()) {
                clearInterval(intervalId);
                this.removeInjectedContent();
                return;
            }
            // Wait for comments section to appear
            if (document.getElementById(this.commentsSectionId)) {
                clearInterval(intervalId);
                await this.checkAndInject();
                if (isUrlChanged) {
                    window.postMessage({ type: 'URL_CHANGE_TO_VIDEO', url: window.location.href }, '*');
                }
            }
        }, 2000);
    }

    async checkAndInject() {
        if (!DOMHelper.isVideoWatchPage()) return;

        const appContainer = DOMHelper.createAppContainer(this.commentsSectionId, this.appContainerId);
        if (appContainer && !this.root) {
            console.info('[YCN-Content] App container ready, mounting React app');
            console.debug('[YCN-Content] i18n is initialized, translations will load asynchronously');
            this.mountReactApp(appContainer);
        }
    }

    mountReactApp(container: HTMLElement) {
        this.root = ReactDOM.createRoot(container);
        
        const AppWrapper = () => {
            const [languageDirection, setLanguageDirection] = useState(getLanguageDirection(i18n.language));

            useEffect(() => {
                const handleLanguageChange = (lng: string) => {
                    setLanguageDirection(getLanguageDirection(lng));
                };
                i18n.on('languageChanged', handleLanguageChange);
                return () => {
                    i18n.off('languageChanged', handleLanguageChange);
                };
            }, []);

            useEffect(() => {
                if (languageDirection === 'rtl') {
                    container.classList.add('rtl');
                    container.classList.remove('ltr');
                } else {
                    container.classList.add('ltr');
                    container.classList.remove('rtl');
                }
                container.setAttribute('dir', languageDirection);
            }, [languageDirection]);

            return (
                <Provider store={store}>
                    <App />
                </Provider>
            );
        };

        this.root.render(
             isLocalEnvironment() ? (
                <React.StrictMode>
                    <AppWrapper />
                </React.StrictMode>
            ) : (
                <AppWrapper />
            )
        );
    }

    async setupInitialLoad() {
        console.info('[YCN-Content] Setting up initial load...');
        
        // Inject scripts in parallel for better performance
        // i18n is already initialized, translations will load asynchronously
        console.info('[YCN-Content] Injecting scripts...');
        
        Promise.all([
            this.injectTranslations().catch(error => {
                console.error('[YCN-Content] ✗ Failed to inject translations:', error);
            }),
            this.injectPotTokenRetriever().catch(error => {
                console.error('[YCN-Content] ✗ Failed to inject POT token retriever:', error);
            })
        ]).then(() => {
            console.info('[YCN-Content] ✓ All scripts injected');
        });
        
        // Start checking for the app container immediately
        // No need to wait for translations since i18n is already initialized
        console.info('[YCN-Content] Starting app injection interval');
        this.checkAndInjectWithInterval();
    }

    injectScript(scriptName: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const scriptUrl = chrome.runtime.getURL(scriptName);
            console.debug(`[YCN-Content] Checking if script already injected: ${scriptName}`);
            
            if (document.querySelector(`script[src="${scriptUrl}"]`)) {
                console.info(`[YCN-Content] Script already injected: ${scriptName}`);
                resolve();
                return;
            }

            console.info(`[YCN-Content] Injecting script: ${scriptName}`);
            const script = document.createElement('script');
            script.src = scriptUrl;
            
            script.onload = () => {
                console.info(`[YCN-Content] Script loaded successfully: ${scriptName}`);
                script.remove();
                resolve();
            };
            
            script.onerror = (error) => {
                console.error(`[YCN-Content] Failed to load script: ${scriptName}`, error);
                reject(new Error(`Failed to load script: ${scriptName}`));
            };
            
            (document.head || document.documentElement).appendChild(script);
        });
    }

    async injectTranslations() {
        try {
            console.info('[YCN-Content] Starting translation injection process...');
            
            // First, inject the translation receiver script into page context
            await this.injectScript('inject-translations.js');
            console.debug('[YCN-Content] Translation receiver script injected');
            
            // Get user's preferred language
            const userLanguage = chrome.i18n.getUILanguage().split('-')[0];
            console.info(`[YCN-Content] Detected user language: ${userLanguage}`);
            
            // List of supported languages
            const supportedLanguages = [
                'ar', 'bn', 'cs', 'da', 'de', 'el', 'en', 'es', 'fa', 'fi',
                'fr', 'he', 'hi', 'hu', 'id', 'it', 'ja', 'jv', 'ko', 'krt',
                'mr', 'ms', 'nl', 'no', 'pa', 'pl', 'pt', 'ro', 'ru', 'sk',
                'sr', 'sv', 'ta', 'te', 'th', 'tl', 'tr', 'uk', 'ur', 'vi', 'zh'
            ];
            
            // Fallback to 'en' if user's language is not supported
            const language = supportedLanguages.includes(userLanguage) ? userLanguage : 'en';
            
            if (language !== userLanguage) {
                console.warn(`[YCN-Content] User language '${userLanguage}' not supported, falling back to '${language}'`);
            } else {
                console.debug(`[YCN-Content] Using user language: ${language}`);
            }
            
            // Fetch the translation file using Chrome extension API
            const translationUrl = chrome.runtime.getURL(`locales/${language}/translation.json`);
            console.info(`[YCN-Content] Fetching translations from: ${translationUrl}`);
            
            const response = await fetch(translationUrl);
            
            if (!response.ok) {
                throw new Error(`Failed to fetch translations: ${response.status} ${response.statusText}`);
            }
            
            const translations = await response.json();
            console.info(`[YCN-Content] Translations loaded successfully (${Object.keys(translations).length} keys)`);
            console.debug('[YCN-Content] Translation keys:', Object.keys(translations).slice(0, 10).join(', ') + '...');
            
            // Send translations to page context
            window.postMessage({
                type: 'YCN_INJECT_TRANSLATIONS',
                payload: {
                    language,
                    translations
                }
            }, '*');
            
            console.info(`[YCN-Content] Translations sent to page context for language: ${language}`);
            
        } catch (error) {
            console.error('[YCN-Content] Failed to inject translations:', error);
            
            // Try fallback to English
            try {
                console.warn('[YCN-Content] Attempting to load English as fallback...');
                const fallbackUrl = chrome.runtime.getURL('locales/en/translation.json');
                const fallbackResponse = await fetch(fallbackUrl);
                
                if (fallbackResponse.ok) {
                    const fallbackTranslations = await fallbackResponse.json();
                    console.info('[YCN-Content] English fallback translations loaded');
                    
                    window.postMessage({
                        type: 'YCN_INJECT_TRANSLATIONS',
                        payload: {
                            language: 'en',
                            translations: fallbackTranslations
                        }
                    }, '*');
                    
                    console.info('[YCN-Content] Fallback English translations sent to page context');
                } else {
                    console.error('[YCN-Content] Failed to load fallback translations:', fallbackResponse.status);
                }
            } catch (fallbackError) {
                console.error('[YCN-Content] Critical: Failed to load fallback translations:', fallbackError);
            }
        }
    }

    async injectPotTokenRetriever() {
        console.info('[YCN-Content] Injecting POT token retriever...');
        return this.injectScript('retrieve-pot-token.js');
    }

    async onUrlChange() {
        // If we have a root, we might want to unmount/remount or just let Redux handle state reset?
        // Original logic: checkAndInjectWithInterval(true);
        // It didn't explicitly unmount on URL change *to another video*, but it did publish 'urlchange'.
        // React App handles data fetching on URL change? 
        // looking at App.tsx, it uses useAppState which likely reacts to data.
        // But let's follow the original flow:
        this.checkAndInjectWithInterval(true);
        window.postMessage({ type: 'URL_CHANGED', url: window.location.href }, '*');
    }

    removeInjectedContent() {
        window.postMessage({ type: 'STOP_VIDEO_NAVIGATION', url: window.location.href }, '*');
        if (this.root) {
            this.root.unmount();
            this.root = null;
        }
        DOMHelper.removeAppContainer(this.appContainerId);
    }
}

// Start
const pubSub = new PubSub();
new URLChangeHandler(pubSub);
new YouTubeCommentNavigator(pubSub);

// Handle unmount on page unload
window.addEventListener('beforeunload', () => {
   // Cleanup if needed
});

// Listen for fetch requests from background worker
// Background worker can't make requests with proper browser headers (sec-fetch-site, Referer, etc.)
// So we make them from content script context where browser adds these automatically
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'MAKE_FETCH_REQUEST') {
        console.info('[YCN-Content] Received fetch request from background worker', {
            requestId: message.requestId,
            url: message.preparedRequest?.url
        });

        // Make the fetch request with proper browser context
        (async () => {
            try {
                const { url, method, headers, body } = message.preparedRequest;
                
                const response = await fetch(url, {
                    method,
                    headers,
                    body,
                    credentials: 'include'
                });

                // Read response
                const responseBody = await response.text();
                
                // Send response back to background worker
                chrome.runtime.sendMessage({
                    type: 'FETCH_RESPONSE',
                    requestId: message.requestId,
                    success: true,
                    responseData: {
                        status: response.status,
                        statusText: response.statusText,
                        headers: Object.fromEntries(response.headers.entries()),
                        body: responseBody
                    }
                }).catch(error => {
                    console.error('[YCN-Content] Failed to send response to background:', error);
                });
                
                console.info('[YCN-Content] Fetch request completed successfully', {
                    requestId: message.requestId,
                    status: response.status
                });
            } catch (error) {
                console.error('[YCN-Content] Fetch request failed:', error);
                
                // Send error back to background worker
                chrome.runtime.sendMessage({
                    type: 'FETCH_RESPONSE',
                    requestId: message.requestId,
                    success: false,
                    error: error instanceof Error ? error.message : String(error)
                }).catch(err => {
                    console.error('[YCN-Content] Failed to send error to background:', err);
                });
            }
        })();
        
        // Return true to indicate async response
        return true;
    }
});
