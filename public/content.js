class PubSub {
    constructor() {
        this.events = {};
    }

    subscribe(event, callback) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(callback);
    }

    publish(event, data) {
        if (this.events[event]) {
            this.events[event].forEach(callback => callback(data));
        }
    }
}

class AssetInjector {
    constructor(manifestUrl) {
        this.manifestUrl = manifestUrl;
        this.mainJs = null;
        this.mainCss = null;

        // Listen for messages from the React app
        window.addEventListener('message', this.handleMessage.bind(this));
    }

    async loadManifest() {
        try {
            const response = await fetch(this.manifestUrl);
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const manifest = await response.json();
            this.mainJs = manifest['files']['main.js'];
            this.mainCss = manifest['files']['main.css'];
        } catch (err) {
            console.error('Error fetching asset manifest:', err);
        }
    }

    async injectReactApp(container) {
        if (!this.mainJs || !this.mainCss) {
            await this.loadManifest();
        }

        this.injectCSS(this.mainCss);
        this.injectJS(this.mainJs);
    }

    injectCSS(cssFileName) {
        if (!document.querySelector(`link[href="${chrome.runtime.getURL(cssFileName)}"]`)) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = chrome.runtime.getURL(cssFileName);
            document.head.appendChild(link);
        }
    }

    injectJS(jsFileName) {
        if (!document.querySelector(`script[src="${chrome.runtime.getURL(jsFileName)}"]`)) {
            const script = document.createElement('script');
            script.src = chrome.runtime.getURL(jsFileName);
            script.onload = () => {
            };
            script.onerror = () => {
                console.error('Error loading React app script:', script.src);
            };
            document.head.appendChild(script);
        }
    }

    async injectTranslation(locale) {
        const namespace = 'translation';

        try {
            const response = await fetch(chrome.runtime.getURL(`locales/${locale}/${namespace}.json`));
            const data = await response.json();
            const script = document.createElement('script');
            script.type = 'application/json';
            script.id = `locale-${locale}`;
            script.text = JSON.stringify(data);
            document.head.appendChild(script);

            // Notify React app that the translation has been loaded
            window.postMessage({type: 'LANGUAGE_LOADED', payload: {language: locale}}, '*');
        } catch (error) {
            console.error(`Error fetching locale file for ${locale}:`, error);
        }
    }

    handleMessage(event) {
        if (event.source !== window) return; // Only accept messages from the same window

        const {type, payload} = event.data;
        if (type === 'CHANGE_LANGUAGE') {
            const {language} = payload;
            this.injectTranslation(language);
        }
    }

    removeJS(jsFileName) {
        const script = document.querySelector(`script[src="${chrome.runtime.getURL(jsFileName)}"]`);
        if (script) {
            script.remove();
        }
    }
}

class DOMHelper {
    static createAppContainer(commentsSectionId, containerId) {
        const commentsSection = document.getElementById(commentsSectionId);
        if (!commentsSection) {
            return null;
        }

        const newAppContainer = document.createElement('div');
        newAppContainer.id = containerId;
        newAppContainer.style.width = '100%';
        commentsSection.parentNode.insertBefore(newAppContainer, commentsSection);
        return newAppContainer;
    }

    static removeAppContainer(containerId) {
        const appContainer = document.getElementById(containerId);
        if (appContainer) {
            appContainer.remove();
        }
    }

    static isVideoWatchPage() {
        return window.location.pathname === '/watch' && new URLSearchParams(window.location.search).has('v');
    }
}

class URLChangeHandler {
    constructor(pubSub) {
        this.pubSub = pubSub;
        this.currentUrl = window.location.href;
        this.eventDetails = new AbortController();
        this.hookHistoryMethods();
        this.monitorUrlChange();
    }

    hookHistoryMethods() {
        const originalPushState = history.pushState;
        const originalReplaceState = history.replaceState;

        history.pushState = (...args) => {
            originalPushState.apply(this, args);
            window.dispatchEvent(new Event('urlchange'));
        };

        history.replaceState = (...args) => {
            originalReplaceState.apply(this, args);
            window.dispatchEvent(new Event('urlchange'));
        };

        window.addEventListener('popstate', () => {
            window.dispatchEvent(new Event('urlchange'));
        });
    }

    async monitorUrlChange() {
        const handler = async () => {
            const newUrl = window.location.href;
            if (this.currentUrl !== newUrl) {
                this.currentUrl = newUrl;
                this.eventDetails.abort();
                this.pubSub.publish('urlchange', newUrl);
            }
        };

        setInterval(handler, 1000);
    }
}

/**
 * Class representing the YouTube Comment Navigator.
 * Handles the injection of a React application into the YouTube comments section.
 */
class YouTubeCommentNavigator {
    /**
     * Initializes the YouTubeCommentNavigator instance.
     * @param {PubSub} pubSub - An instance of the PubSub class for handling custom events.
     */
    constructor(pubSub) {
        this.appContainerId = 'youtube-comment-navigator-app';
        this.commentsSectionId = 'comments';
        this.assetInjector = new AssetInjector(chrome.runtime.getURL('asset-manifest.json'));
        this.pubSub = pubSub;
        this.pubSub.subscribe('urlchange', () => this.onUrlChange());

        this.setupInitialLoad();
    }

    /**
     * Checks for the presence of the comments section at regular intervals and injects the React app when found.
     * This function is used to ensure that the app is injected as soon as the comments section becomes available.
     */
    checkAndInjectWithInterval(isUrlChanged = false) {
        const intervalId = setInterval(async () => {
            if (!DOMHelper.isVideoWatchPage()) {
                clearInterval(intervalId);
                return;
            }
            if (document.getElementById(this.commentsSectionId)) {
                clearInterval(intervalId);
                await this.checkAndInject();
                if (isUrlChanged) {
                    window.postMessage({type: 'URL_CHANGE_TO_VIDEO', url: window.location.href}, '*');
                }
            }
        }, 2000);
    }

    /**
     * Injects the React application into the YouTube comments section.
     * Creates a new app container and injects the React app if the comments section is present.
     */
    async checkAndInject() {
        const appContainer = DOMHelper.createAppContainer(this.commentsSectionId, this.appContainerId);
        if (appContainer) {
            await this.assetInjector.injectReactApp(appContainer);
        }
    }

    /**
     * Sets up the initial load by checking and injecting the React application.
     * This function ensures that the app is injected on the initial page load.
     */
    setupInitialLoad() {
        this.checkAndInjectWithInterval();
    }

    /**
     * Handles the URL change event.
     * Removes the existing app and reinjects it if the new URL is a YouTube watch page.
     */
    async onUrlChange() {
        this.checkAndInjectWithInterval(true);
    }
}

// Instantiate the PubSub and YouTubeCommentNavigator
const pubSub = new PubSub();
new URLChangeHandler(pubSub);
new YouTubeCommentNavigator(pubSub);

