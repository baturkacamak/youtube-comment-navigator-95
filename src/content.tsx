import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import store from './store/store';
import App from './App';
import './styles/index.css';
import './i18n';
import i18n, { getLanguageDirection } from './i18n';
import { isLocalEnvironment, languageOptions } from './features/shared/utils/appConstants';

// --- Helper Classes ---

class DOMHelper {
  static createAppContainer(commentsSectionId: string, containerId: string): HTMLElement | null {
    const commentsSection = document.getElementById(commentsSectionId);
    if (!commentsSection) {
      return null;
    }

    const existing = document.getElementById(containerId);
    if (existing) return existing;

    const newAppContainer = document.createElement('div');
    newAppContainer.id = containerId;
    newAppContainer.style.width = '100%';
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
    return (
      window.location.pathname === '/watch' && new URLSearchParams(window.location.search).has('v')
    );
  }
}

type EventCallback = (data: string) => void;

class PubSub {
  events: Record<string, EventCallback[]>;

  constructor() {
    this.events = {};
  }

  subscribe(event: string, callback: EventCallback) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
  }

  publish(event: string, data: string) {
    if (this.events[event]) {
      this.events[event].forEach((callback) => callback(data));
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
      this.mountReactApp(appContainer);
    }
  }

  mountReactApp(container: HTMLElement) {
    this.root = ReactDOM.createRoot(container);

    const AppWrapper = () => {
      const [languageDirection, setLanguageDirection] = useState(
        getLanguageDirection(i18n.language)
      );

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

  setupInitialLoad() {
    Promise.all([this.injectTranslations(), this.injectPotTokenRetriever()]).catch(() => {
      // Errors are handled in individual methods
    });

    this.checkAndInjectWithInterval();
  }

  injectScript(scriptName: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const scriptUrl = chrome.runtime.getURL(scriptName);

      if (document.querySelector(`script[src="${scriptUrl}"]`)) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = scriptUrl;

      script.onload = () => {
        script.remove();
        resolve();
      };

      script.onerror = () => {
        reject(new Error(`Failed to load script: ${scriptName}`));
      };

      (document.head || document.documentElement).appendChild(script);
    });
  }

  async injectTranslations() {
    try {
      const userLanguage = chrome.i18n.getUILanguage().split('-')[0];
      const supportedLanguages = languageOptions.map((opt) => opt.value);
      const language = supportedLanguages.includes(userLanguage) ? userLanguage : 'en';

      await this.loadAndInjectLanguage(language);
    } catch {
      await this.loadAndInjectLanguage('en').catch(() => {
        // Silent fail - app will work with fallback keys
      });
    }
  }

  async loadAndInjectLanguage(language: string): Promise<void> {
    const supportedLanguages = languageOptions.map((opt) => opt.value);

    if (!supportedLanguages.includes(language)) {
      language = 'en';
    }

    const translationUrl = chrome.runtime.getURL(`locales/${language}/translation.json`);
    const response = await fetch(translationUrl);

    if (!response.ok) {
      throw new Error(`Failed to fetch translations for '${language}': ${response.status}`);
    }

    const translations = await response.json();

    if (!window.__YCN_TRANSLATIONS__) {
      window.__YCN_TRANSLATIONS__ = {};
    }
    window.__YCN_TRANSLATIONS__[language] = translations;

    window.postMessage(
      {
        type: 'LANGUAGE_LOADED',
        payload: { language },
      },
      '*'
    );
  }

  injectPotTokenRetriever(): Promise<void> {
    return this.injectScript('retrieve-pot-token.js');
  }

  async onUrlChange() {
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
const navigator = new YouTubeCommentNavigator(pubSub);

window.addEventListener('beforeunload', () => {
  // Cleanup if needed
});

// Listen for language change requests from the React app
window.addEventListener('message', (event: MessageEvent) => {
  if (event.source !== window) return;

  const { type, payload } = event.data;

  if (type === 'CHANGE_LANGUAGE') {
    const { language } = payload || {};
    if (!language) return;

    navigator.loadAndInjectLanguage(language).catch(() => {
      if (language !== 'en') {
        navigator.loadAndInjectLanguage('en').catch(() => {
          // Silent fail
        });
      }
    });
  }
});
