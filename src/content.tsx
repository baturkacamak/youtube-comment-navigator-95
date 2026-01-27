import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import store from './store/store';
import App from './App';
import './styles/index.css';
import './i18n';
import i18n, { getLanguageDirection } from './i18n';
import { isLocalEnvironment } from './features/shared/utils/appConstants';

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
    return (
      window.location.pathname === '/watch' && new URLSearchParams(window.location.search).has('v')
    );
  }
}

class PubSub {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  events: { [key: string]: ((...args: any[]) => void)[] };

  constructor() {
    this.events = {};
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  subscribe(event: string, callback: Function) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.events[event].push(callback as any);
  }

  publish(event: string, data: any) {
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
    // Inject POT Token Retriever (Legacy support, maybe needed?)
    // If the original content.js injected it, we should too.
    // It was: assetInjector.injectPotTokenRetriever();
    this.injectPotTokenRetriever();

    this.checkAndInjectWithInterval();
  }

  injectPotTokenRetriever() {
    const scriptName = 'retrieve-pot-token.js';
    // In Vite/CRXJS, resources in public/ are accessible via chrome.runtime.getURL
    // provided they are in web_accessible_resources.
    if (!document.querySelector(`script[src="${chrome.runtime.getURL(scriptName)}"]`)) {
      const script = document.createElement('script');
      script.src = chrome.runtime.getURL(scriptName);
      (document.head || document.documentElement).appendChild(script);
      script.onload = function () {
        script.remove();
      };
    }
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
