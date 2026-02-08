import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import store from './store/store';
import App from './App';
import './styles/index.css';
import './i18n';
import i18n, { getLanguageDirection } from './i18n';
import { isLocalEnvironment, languageOptions } from './features/shared/utils/appConstants';
import { ToastProvider } from './features/shared/contexts/ToastContext';
import ToastContainer from './features/shared/components/ToastContainer';
import PlaylistBatchExportWidget from './features/batch-export/components/PlaylistBatchExportWidget';

// --- Helper Classes ---

class DOMHelper {
  private static readonly SHORTS_PANEL_SELECTORS = [
    'ytd-reel-engagement-panel-overlay-renderer:not([hidden])',
    'ytd-engagement-panel-section-list-renderer[target-id*="comments"]:not([hidden])',
    'ytd-engagement-panel-section-list-renderer[target-id*="engagement-panel-comments"]:not([hidden])',
  ];

  static createWatchAppContainer(
    commentsSectionId: string,
    containerId: string
  ): HTMLElement | null {
    const commentsSection = document.getElementById(commentsSectionId);
    if (!commentsSection) {
      return null;
    }

    const parent = commentsSection.parentNode;
    if (!parent) {
      return null;
    }

    const existing = document.getElementById(containerId) as HTMLElement | null;
    if (existing) {
      if (existing.parentNode !== parent || existing.nextSibling !== commentsSection) {
        existing.remove();
        parent.insertBefore(existing, commentsSection);
      }
      this.configureWatchContainer(existing);
      return existing;
    }

    const newAppContainer = document.createElement('div');
    newAppContainer.id = containerId;
    this.configureWatchContainer(newAppContainer);
    parent.insertBefore(newAppContainer, commentsSection);
    return newAppContainer;
  }

  static ensureShortsAppContainer(containerId: string): HTMLElement {
    const existing = document.getElementById(containerId) as HTMLElement | null;
    const container = existing || document.createElement('div');
    container.id = containerId;
    this.repositionShortsContainer(container);
    return container;
  }

  static repositionShortsContainer(container: HTMLElement) {
    const panelHost = this.getVisibleShortsPanelHost();

    if (container.parentNode !== document.body) {
      container.remove();
      document.body.appendChild(container);
    }
    this.configureShortsFloatingContainer(container, panelHost);
  }

  static createPlaylistBatchContainer(containerId: string): HTMLElement {
    const existing = document.getElementById(containerId);
    if (existing) return existing;

    const container = document.createElement('div');
    container.id = containerId;
    container.style.position = 'fixed';
    container.style.top = '88px';
    container.style.right = '16px';
    container.style.zIndex = '2147483646';
    container.style.maxWidth = '440px';
    document.body.appendChild(container);
    return container;
  }

  static removeAppContainer(containerId: string) {
    const appContainer = document.getElementById(containerId);
    if (appContainer) {
      appContainer.remove();
    }
  }

  private static configureWatchContainer(container: HTMLElement) {
    container.style.position = '';
    container.style.top = '';
    container.style.right = '';
    container.style.bottom = '';
    container.style.left = '';
    container.style.zIndex = '';
    container.style.maxWidth = '';
    container.style.width = '100%';
    container.style.transform = '';
    container.style.transition = '';
  }

  private static configureShortsFloatingContainer(
    container: HTMLElement,
    panelHost: HTMLElement | null
  ) {
    const viewportPadding = 24;
    const baseRightOffset = 16;
    const minOverlayWidth = 220;
    const preferredOverlayWidth = 420;

    container.style.position = 'fixed';
    container.style.top = '88px';
    container.style.right = `${baseRightOffset}px`;
    container.style.left = '';
    container.style.bottom = '';
    container.style.zIndex = '2147483646';
    container.style.transition = 'transform 180ms ease-out';

    const availableViewportWidth = Math.max(minOverlayWidth, window.innerWidth - viewportPadding);
    const finalWidth = Math.max(
      minOverlayWidth,
      Math.min(preferredOverlayWidth, availableViewportWidth)
    );
    container.style.width = `${finalWidth}px`;
    container.style.maxWidth = `${finalWidth}px`;

    if (panelHost) {
      const offscreenShift = Math.min(120, Math.max(56, Math.floor(finalWidth * 0.22)));
      container.style.transform = `translateX(${offscreenShift}px)`;
    } else {
      container.style.transform = '';
    }
  }

  private static getVisibleShortsPanelHost(): HTMLElement | null {
    for (const selector of this.SHORTS_PANEL_SELECTORS) {
      const candidate = document.querySelector(selector) as HTMLElement | null;
      if (candidate && this.isElementVisible(candidate)) {
        return candidate;
      }
    }
    return null;
  }

  private static isElementVisible(element: HTMLElement): boolean {
    const style = window.getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
      return false;
    }

    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  static isVideoWatchPage() {
    return (
      window.location.pathname === '/watch' && new URLSearchParams(window.location.search).has('v')
    );
  }

  static isShortsPage() {
    return window.location.pathname.startsWith('/shorts');
  }

  static isPlaylistPage() {
    return (
      window.location.pathname === '/playlist' &&
      new URLSearchParams(window.location.search).has('list')
    );
  }

  static isSupportedPage() {
    return this.isVideoWatchPage() || this.isShortsPage() || this.isPlaylistPage();
  }
}

type EventCallback = (data: string) => void;

class PubSub {
  events: Record<string, EventCallback[]>;

  constructor() {
    this.events = {
      /* no-op */
    };
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
    const playlistId = urlObj.searchParams.get('list');
    if (videoId) {
      baseUrl += `?v=${videoId}`;
      if (playlistId) {
        baseUrl += `&list=${playlistId}`;
      }
    } else if (playlistId) {
      baseUrl += `?list=${playlistId}`;
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
  playlistBatchContainerId = 'youtube-comment-navigator-playlist-batch';
  commentsSectionId = 'comments';
  pubSub: PubSub;
  root: ReactDOM.Root | null = null;
  playlistRoot: ReactDOM.Root | null = null;
  private shortsPlacementIntervalId: number | null = null;
  private activeMountMode: 'watch' | 'shorts' | 'playlist' | null = null;
  private isInitialized = false;

  constructor(pubSub: PubSub) {
    this.pubSub = pubSub;
    this.pubSub.subscribe('urlchange', () => this.onUrlChange());
    this.setupInitialLoad();
  }

  checkAndInjectWithInterval(isUrlChanged = false) {
    const intervalId = setInterval(async () => {
      if (!DOMHelper.isSupportedPage()) {
        clearInterval(intervalId);
        this.removeInjectedContent();
        return;
      }

      if (DOMHelper.isVideoWatchPage() && document.getElementById(this.commentsSectionId)) {
        clearInterval(intervalId);
        await this.checkAndInjectWatchPage();
        if (isUrlChanged) {
          window.postMessage({ type: 'URL_CHANGE_TO_VIDEO', url: window.location.href }, '*');
        }
        return;
      }

      if (DOMHelper.isShortsPage()) {
        clearInterval(intervalId);
        await this.checkAndInjectShortsPage();
        if (isUrlChanged) {
          window.postMessage({ type: 'URL_CHANGE_TO_VIDEO', url: window.location.href }, '*');
        }
        return;
      }

      if (DOMHelper.isPlaylistPage()) {
        clearInterval(intervalId);
        await this.checkAndInjectPlaylistPage();
        return;
      }
    }, 2000);
  }

  async checkAndInjectWatchPage() {
    await this.ensureInitialized();
    this.stopShortsPlacementSync();

    if (this.playlistRoot) {
      this.playlistRoot.unmount();
      this.playlistRoot = null;
      DOMHelper.removeAppContainer(this.playlistBatchContainerId);
    }

    const appContainer = DOMHelper.createWatchAppContainer(
      this.commentsSectionId,
      this.appContainerId
    );
    if (!appContainer) {
      return;
    }

    if (this.activeMountMode !== 'watch' && this.root) {
      this.root.unmount();
      this.root = null;
    }

    if (!this.root) {
      this.mountReactApp(appContainer);
    }
    this.activeMountMode = 'watch';
  }

  async checkAndInjectShortsPage() {
    await this.ensureInitialized();

    if (this.playlistRoot) {
      this.playlistRoot.unmount();
      this.playlistRoot = null;
      DOMHelper.removeAppContainer(this.playlistBatchContainerId);
    }

    const appContainer = DOMHelper.ensureShortsAppContainer(this.appContainerId);

    if (this.activeMountMode !== 'shorts' && this.root) {
      this.root.unmount();
      this.root = null;
    }

    if (!this.root) {
      this.mountReactApp(appContainer);
    }
    this.activeMountMode = 'shorts';
    this.startShortsPlacementSync();
  }

  async checkAndInjectPlaylistPage() {
    await this.ensureInitialized();
    this.stopShortsPlacementSync();

    if (this.root) {
      this.root.unmount();
      this.root = null;
      DOMHelper.removeAppContainer(this.appContainerId);
    }

    const container = DOMHelper.createPlaylistBatchContainer(this.playlistBatchContainerId);
    if (container && !this.playlistRoot) {
      this.mountPlaylistBatchWidget(container);
    }
    this.activeMountMode = 'playlist';
  }

  private startShortsPlacementSync() {
    if (this.shortsPlacementIntervalId) {
      return;
    }

    this.shortsPlacementIntervalId = window.setInterval(() => {
      if (!DOMHelper.isShortsPage()) {
        this.stopShortsPlacementSync();
        return;
      }

      const container = document.getElementById(this.appContainerId) as HTMLElement | null;
      if (container) {
        DOMHelper.repositionShortsContainer(container);
      }
    }, 1000);
  }

  private stopShortsPlacementSync() {
    if (this.shortsPlacementIntervalId !== null) {
      clearInterval(this.shortsPlacementIntervalId);
      this.shortsPlacementIntervalId = null;
    }
  }

  async ensureInitialized() {
    if (this.isInitialized) return;

    try {
      await Promise.all([
        this.injectTranslations(),
        this.injectPotTokenRetriever(),
        this.injectVideoController(),
      ]);
      this.isInitialized = true;
    } catch {
      // Errors are handled in individual methods or ignored if non-critical
    }
  }

  mountReactApp(container: HTMLElement) {
    this.root = ReactDOM.createRoot(container);

    // Apply initial theme to container
    const applyInitialTheme = () => {
      try {
        const savedSettings = localStorage.getItem('settings');
        const settings = savedSettings
          ? JSON.parse(savedSettings)
          : {
              /* no-op */
            };
        const theme = settings.theme || localStorage.getItem('theme') || 'light';
        const isDark = theme === 'dark';
        document.documentElement.classList.toggle('dark', isDark);
        container.classList.toggle('dark', isDark);
      } catch {
        // Ignore errors, default to light theme
      }
    };
    applyInitialTheme();

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
          <ToastProvider>
            <App />
            <ToastContainer />
          </ToastProvider>
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

  mountPlaylistBatchWidget(container: HTMLElement) {
    this.playlistRoot = ReactDOM.createRoot(container);

    const applyInitialTheme = () => {
      try {
        const savedSettings = localStorage.getItem('settings');
        const settings = savedSettings
          ? JSON.parse(savedSettings)
          : {
              /* no-op */
            };
        const theme = settings.theme || localStorage.getItem('theme') || 'light';
        const isDark = theme === 'dark';
        document.documentElement.classList.toggle('dark', isDark);
        container.classList.toggle('dark', isDark);
      } catch {
        // Ignore errors, default to light theme
      }
    };
    applyInitialTheme();

    this.playlistRoot.render(
      <ToastProvider>
        <PlaylistBatchExportWidget />
        <ToastContainer />
      </ToastProvider>
    );
  }

  setupInitialLoad() {
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
      window.__YCN_TRANSLATIONS__ = {
        /* no-op */
      };
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

  injectVideoController(): Promise<void> {
    return this.injectScript('video-controller.js');
  }

  async onUrlChange() {
    this.checkAndInjectWithInterval(true);
    window.postMessage({ type: 'URL_CHANGED', url: window.location.href }, '*');
  }

  removeInjectedContent() {
    window.postMessage({ type: 'STOP_VIDEO_NAVIGATION', url: window.location.href }, '*');
    this.stopShortsPlacementSync();
    if (this.root) {
      this.root.unmount();
      this.root = null;
    }
    if (this.playlistRoot) {
      this.playlistRoot.unmount();
      this.playlistRoot = null;
    }
    DOMHelper.removeAppContainer(this.appContainerId);
    DOMHelper.removeAppContainer(this.playlistBatchContainerId);
    this.activeMountMode = null;
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
    const { language } =
      payload ||
      {
        /* no-op */
      };
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
