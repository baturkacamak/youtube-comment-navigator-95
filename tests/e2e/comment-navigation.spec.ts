import { test, expect, BrowserContext, Page } from '@playwright/test';
import {
  launchExtension,
  navigateToYouTubeVideo,
  clearLocalStorage,
  handleYouTubeConsent,
} from './helpers/extension';

/**
 * E2E tests for comment navigation - ESSENTIAL BROWSER TESTS ONLY
 * Basic smoke test that navigation works in real browser
 * Detailed navigation logic tested in integration tests
 */

let context: BrowserContext;
let page: Page;

test.describe('Comment Navigation E2E', () => {
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

  test('navigation controls are visible and functional', async () => {
    // Check navigation buttons exist
    const nextButton = page.locator('[data-testid="next-button"], button:has-text("Next")');
    const prevButton = page.locator('[data-testid="prev-button"], button:has-text("Previous")');

    await expect(nextButton.first()).toBeVisible({ timeout: 10000 });
    await expect(prevButton.first()).toBeVisible({ timeout: 10000 });

    // Basic click test
    await nextButton.first().click();
    await page.waitForTimeout(500);

    // Extension should still be visible (didn't crash)
    const extensionRoot = page.locator('#youtube-comment-navigator-app');
    await expect(extensionRoot).toBeVisible();
  });
});
