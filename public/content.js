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

    removeAssets() {
        this.removeCSS(this.mainCss);
        this.removeJS(this.mainJs);
    }

    removeCSS(cssFileName) {
        const link = document.querySelector(`link[href="${chrome.runtime.getURL(cssFileName)}"]`);
        if (link) {
            link.remove();
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
        this.currentUrl = this.getRelevantUrl(window.location.href);
        this.monitorUrlChange();
    }

    getRelevantUrl(url) {
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

/**
 * Class representing the YouTube Comment Navigator.
 * Handles the injection of a React application into the YouTube comments section.
 */
class YouTubeCommentNavigator {
    constructor(pubSub) {
        this.appContainerId = 'youtube-comment-navigator-app';
        this.commentsSectionId = 'comments';
        this.assetInjector = new AssetInjector(chrome.runtime.getURL('asset-manifest.json'));
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
            if (document.getElementById(this.commentsSectionId)) {
                clearInterval(intervalId);
                await this.checkAndInject();
                if (isUrlChanged) {
                    window.postMessage({type: 'URL_CHANGE_TO_VIDEO', url: window.location.href}, '*');
                }
            }
        }, 2000);
    }

    async checkAndInject() {
        if (!DOMHelper.isVideoWatchPage()) return;

        const appContainer = DOMHelper.createAppContainer(this.commentsSectionId, this.appContainerId);
        if (appContainer) {
            await this.assetInjector.injectReactApp(appContainer);
        }
    }

    setupInitialLoad() {
        this.checkAndInjectWithInterval();
    }

    async onUrlChange() {
        this.checkAndInjectWithInterval(true);
    }

    removeInjectedContent() {
        DOMHelper.removeAppContainer(this.appContainerId);
        this.assetInjector.removeAssets();
    }
}

// Instantiate the PubSub and YouTubeCommentNavigator
const pubSub = new PubSub();
new URLChangeHandler(pubSub);
new YouTubeCommentNavigator(pubSub);

