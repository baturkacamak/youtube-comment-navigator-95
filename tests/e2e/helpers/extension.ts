import { chromium, BrowserContext, Page } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * Helper utilities for loading and testing the Chrome extension
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const EXTENSION_PATH = path.join(__dirname, '../../../dist');

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

/**
 * Launch Chrome with the extension loaded
 * Returns a context and page ready for testing
 */
export async function launchExtension(): Promise<ExtensionContext> {
  const context = await chromium.launchPersistentContext('', {
    headless: false, // Extensions require headful mode
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--mute-audio',
    ],
    // Don't show "Chrome is being controlled by automated software" banner
    ignoreDefaultArgs: ['--enable-automation'],
  });

  const page = await context.newPage();
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
    // Wait a short time for potential consent dialog
    const consentDialog = await page.waitForSelector(
      'tp-yt-paper-dialog:has-text("Before you continue"), [aria-label="Reject all"], [aria-label="Accept all"], button:has-text("Reject all"), button:has-text("Accept all"), button:has-text("Accept the use")',
      { timeout: 5000 }
    );

    if (consentDialog) {
      // Try to find and click "Reject all" or "Accept all" button
      const rejectButton = await page.$('button:has-text("Reject all")');
      if (rejectButton) {
        await rejectButton.click();
        await page.waitForTimeout(1000);
        return;
      }

      const acceptButton = await page.$('button:has-text("Accept all")');
      if (acceptButton) {
        await acceptButton.click();
        await page.waitForTimeout(1000);
        return;
      }

      // Try aria-label based buttons
      const ariaReject = await page.$('[aria-label="Reject all"]');
      if (ariaReject) {
        await ariaReject.click();
        await page.waitForTimeout(1000);
        return;
      }

      const ariaAccept = await page.$('[aria-label="Accept all"]');
      if (ariaAccept) {
        await ariaAccept.click();
        await page.waitForTimeout(1000);
        return;
      }
    }
  } catch {
    // No consent dialog appeared, continue
  }
}

/**
 * Navigate to a YouTube video and wait for extension to load
 */
export async function navigateToYouTubeVideo(
  page: Page,
  videoId = defaultTestVideo.id
): Promise<void> {
  await page.goto(`https://www.youtube.com/watch?v=${videoId}`, {
    waitUntil: 'domcontentloaded',
  });

  // Handle cookie consent dialog if it appears
  await handleYouTubeConsent(page);

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
  await page.evaluate(() => {
    localStorage.clear();
  });
}
