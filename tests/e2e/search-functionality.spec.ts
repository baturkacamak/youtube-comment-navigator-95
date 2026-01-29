import { test, expect, BrowserContext, Page } from '@playwright/test';
import {
  launchExtension,
  navigateToYouTubeVideo,
  clearLocalStorage,
  handleYouTubeConsent,
} from './helpers/extension';

/**
 * E2E tests for search functionality - ESSENTIAL BROWSER TESTS ONLY
 * Basic smoke test that search works in real browser
 * Detailed search logic tested in integration tests
 */

let context: BrowserContext;
let page: Page;

test.describe('Search Functionality E2E', () => {
  test.beforeAll(async () => {
    const result = await launchExtension();
    context = result.context;
    page = result.page;
    await navigateToYouTubeVideo(page);
  });

  test.beforeEach(async () => {
    await clearLocalStorage(page);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await handleYouTubeConsent(page);
    await page.waitForSelector('ytd-app', { timeout: 15000 });
    await page.evaluate(() => window.scrollTo(0, 500));
    await page.waitForTimeout(2000);
  });

  test.afterAll(async () => {
    await context.close();
  });

  test('search input is functional', async () => {
    const searchInput = page.locator(
      '[data-testid="search-input"], input[placeholder*="search" i], input[type="search"]'
    );

    await expect(searchInput.first()).toBeVisible({ timeout: 10000 });

    // Type in search
    await searchInput.first().fill('test search');
    await page.waitForTimeout(500);

    // Extension should still be functional
    const extensionRoot = page.locator('#youtube-comment-navigator-app');
    await expect(extensionRoot).toBeVisible();
  });
});
