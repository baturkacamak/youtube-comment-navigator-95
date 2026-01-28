import { test, expect, BrowserContext, Page } from '@playwright/test';
import {
  launchExtension,
  navigateToYouTubeVideo,
  clearLocalStorage,
  handleYouTubeConsent,
} from './helpers/extension';

/**
 * E2E tests for extension loading - ESSENTIAL BROWSER TESTS ONLY
 * These tests verify the extension loads correctly in a real Chrome browser
 */

let context: BrowserContext;
let page: Page;

test.describe('Extension Loading', () => {
  test.beforeAll(async () => {
    const result = await launchExtension();
    context = result.context;
    page = result.page;
  });

  test.afterAll(async () => {
    await context.close();
  });

  test('extension loads and injects UI on YouTube video page', async () => {
    await navigateToYouTubeVideo(page);

    // Verify extension UI is injected and visible
    const extensionRoot = page.locator('#youtube-comment-navigator-app');
    await expect(extensionRoot).toBeVisible({ timeout: 15000 });

    // Verify the extension has content
    const hasContent = await page.evaluate(() => {
      const root = document.getElementById('youtube-comment-navigator-app');
      return root ? root.children.length > 0 : false;
    });
    expect(hasContent).toBe(true);
  });

  test('extension displays core UI elements', async () => {
    await clearLocalStorage(page);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await handleYouTubeConsent(page);
    await page.waitForSelector('ytd-app', { timeout: 15000 });
    await page.evaluate(() => window.scrollTo(0, 500));
    await page.waitForTimeout(2000);

    // Check for search input
    const searchInput = page.locator('input[placeholder*="Search"], input[data-testid*="search"]');
    await expect(searchInput.first()).toBeVisible({ timeout: 10000 });

    // Check for settings button
    const settingsButton = page.locator(
      '[data-testid="settings-button"], button[aria-label*="settings" i]'
    );
    await expect(settingsButton.first()).toBeVisible({ timeout: 10000 });
  });
});
