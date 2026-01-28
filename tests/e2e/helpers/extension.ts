import { chromium, BrowserContext, Page } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * Helper utilities for loading and testing the Chrome extension
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const EXTENSION_PATH = path.join(__dirname, '../../../dist');

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
export async function waitForExtensionInjection(page: Page, timeout = 15000) {
  // Wait for the main extension container to appear
  await page.waitForSelector('[data-testid="ycn-root"], #ycn-root', {
    timeout,
    state: 'attached',
  });
}

/**
 * Navigate to a YouTube video and wait for extension to load
 */
export async function navigateToYouTubeVideo(page: Page, videoId = 'dQw4w9WgXcQ'): Promise<void> {
  await page.goto(`https://www.youtube.com/watch?v=${videoId}`, {
    waitUntil: 'domcontentloaded',
  });

  // Wait for YouTube to load
  await page.waitForSelector('ytd-app', { timeout: 10000 });

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
