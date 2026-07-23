import { chromium, BrowserContext, Page } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * Helper utilities for loading and testing the Chrome extension
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const EXTENSION_PATH = path.join(__dirname, '../../../dist');
const hiddenWindowArgs =
  process.env.PLAYWRIGHT_HIDE_BROWSER === 'true'
    ? ['--window-position=-32000,-32000', '--window-size=1440,900']
    : [];

export interface TestVideo {
  id: string;
  features: Array<'comments' | 'liveChat' | 'transcript'>;
  description?: string;
}

export const testVideos: TestVideo[] = [
  {
    id: 'g_45DyvIuzM',
    features: ['comments', 'liveChat', 'transcript'],
    description: 'Full-featured video with live chat, transcript, and comments',
  },
];

export const defaultTestVideo = testVideos[0];

export interface ExtensionContext {
  context: BrowserContext;
  page: Page;
}

const consentTasks = new WeakMap<Page, { url: string; task: Promise<void> }>();
const preparedPages = new WeakSet<Page>();

const isYouTubePage = (page: Page): boolean => {
  try {
    return new URL(page.url()).hostname.endsWith('youtube.com');
  } catch {
    return false;
  }
};

const prepareYouTubePage = (page: Page): void => {
  if (preparedPages.has(page)) return;
  preparedPages.add(page);

  page.on('domcontentloaded', () => {
    if (!isYouTubePage(page)) return;

    const url = page.url();
    const existingTask = consentTasks.get(page);
    if (existingTask?.url === url) return;

    const task = handleYouTubeConsent(page);
    consentTasks.set(page, { url, task });
  });
};

/**
 * Launch Chrome with the extension loaded
 * Returns a context and page ready for testing
 */
export async function launchExtension(): Promise<ExtensionContext> {
  const context = await chromium.launchPersistentContext('', {
    headless: false,
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--mute-audio',
      ...hiddenWindowArgs,
    ],
    // Don't show "Chrome is being controlled by automated software" banner
    ignoreDefaultArgs: ['--enable-automation'],
  });

  context.on('page', prepareYouTubePage);
  const page = await context.newPage();
  prepareYouTubePage(page);
  return { context, page };
}

/**
 * Wait for the extension to inject its UI on a YouTube video page
 */
export async function waitForExtensionInjection(page: Page, timeout = 30000) {
  // The extension waits for the comments section (#comments) before injecting
  // First wait for the comments section to be present
  await page.waitForSelector('#comments', {
    timeout,
    state: 'attached',
  });

  // Then wait for the main extension container to appear
  // The extension injects a div with id="youtube-comment-navigator-app"
  await page.waitForSelector('#youtube-comment-navigator-app', {
    timeout,
    state: 'attached',
  });
}

/**
 * Handle YouTube cookie consent dialog if it appears
 */
export async function handleYouTubeConsent(page: Page): Promise<void> {
  try {
    const deadline = Date.now() + 15000;

    while (Date.now() < deadline) {
      for (const frame of page.frames()) {
        const rejectButton = frame.getByText(/^Reject all$/i).first();
        if (await rejectButton.isVisible().catch(() => false)) {
          // The consent dialog can be below the viewport or inside a frame.
          await rejectButton.evaluate((button) => (button as HTMLElement).click());
          await page.waitForTimeout(1000);
          return;
        }
      }

      await page.waitForTimeout(250);
    }
  } catch {
    // No consent dialog appeared, continue
  }
}

/** Wait for the centrally scheduled consent dismissal after a YouTube navigation. */
export async function waitForYouTubeConsent(page: Page): Promise<void> {
  if (!isYouTubePage(page)) return;

  const scheduledTask = consentTasks.get(page);
  if (scheduledTask?.url === page.url()) {
    await scheduledTask.task;
    return;
  }

  await handleYouTubeConsent(page);
}

/** Navigate to any YouTube page and dismiss consent before the caller continues. */
export async function navigateToYouTubePage(page: Page, url: string): Promise<void> {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await waitForYouTubeConsent(page);
}

/** Reload a YouTube page and dismiss consent before the caller continues. */
export async function reloadYouTubePage(page: Page): Promise<void> {
  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitForYouTubeConsent(page);
}

/**
 * Navigate to a YouTube video and wait for extension to load
 */
export async function navigateToYouTubeVideo(
  page: Page,
  videoId = defaultTestVideo.id
): Promise<void> {
  await navigateToYouTubePage(page, `https://www.youtube.com/watch?v=${videoId}`);

  // Wait for YouTube to load
  await page.waitForSelector('ytd-app', { timeout: 15000 });

  // Scroll down to trigger comments section loading
  await page.evaluate(() => {
    window.scrollTo(0, 500);
  });

  // Wait a bit for the comments section to appear
  await page.waitForTimeout(2000);

  // Wait for extension injection
  await waitForExtensionInjection(page);
}

/**
 * Collect console messages during test execution
 */
export function setupConsoleCapture(page: Page) {
  const messages: Array<{ type: string; text: string }> = [];

  page.on('console', (msg) => {
    messages.push({
      type: msg.type(),
      text: msg.text(),
    });
  });

  return {
    getMessages: () => messages,
    getErrors: () => messages.filter((m) => m.type === 'error'),
    getWarnings: () => messages.filter((m) => m.type === 'warning'),
    clear: () => (messages.length = 0),
  };
}

/**
 * Get localStorage value from the page
 */
export async function getLocalStorage(page: Page, key: string): Promise<unknown> {
  return page.evaluate((storageKey) => {
    const value = localStorage.getItem(storageKey);
    return value ? JSON.parse(value) : null;
  }, key);
}

/**
 * Set localStorage value in the page
 */
export async function setLocalStorage(page: Page, key: string, value: unknown): Promise<void> {
  await page.evaluate(
    ({ storageKey, storageValue }) => {
      localStorage.setItem(storageKey, JSON.stringify(storageValue));
    },
    { storageKey: key, storageValue: value }
  );
}

/**
 * Clear all localStorage
 */
export async function clearLocalStorage(page: Page): Promise<void> {
  try {
    await page.evaluate(() => {
      localStorage.clear();
    });
  } catch {
    // about:blank has an opaque origin, so localStorage is not available before navigation.
  }
}
