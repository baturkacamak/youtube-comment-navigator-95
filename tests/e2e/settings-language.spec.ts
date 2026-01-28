import { test, expect, BrowserContext, Page } from '@playwright/test';
import {
  launchExtension,
  navigateToYouTubeVideo,
  clearLocalStorage,
  handleYouTubeConsent,
  getLocalStorage,
} from './helpers/extension';

/**
 * E2E tests for settings - ESSENTIAL BROWSER TESTS ONLY
 * These test settings persistence across page reloads (requires real browser)
 * Unit/integration tests cover settings logic
 */

let context: BrowserContext;
let page: Page;

test.describe('Settings Persistence E2E', () => {
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

  test('theme setting persists after page reload', async () => {
    const extensionRoot = page.locator('#youtube-comment-navigator-app');
    await expect(extensionRoot).toBeVisible({ timeout: 10000 });

    // Open settings
    const settingsButton = page.locator('[data-testid="settings-button"]');
    await settingsButton.click();
    await page.waitForTimeout(500);

    // Change theme to dark
    const themeSelect = page.locator('[data-testid="theme-select"]');
    if (await themeSelect.isVisible()) {
      await themeSelect.click();
      await page.waitForTimeout(300);

      const darkOption = page.locator('[data-testid="option-dark"]');
      if (await darkOption.isVisible()) {
        await darkOption.click();
        await page.waitForTimeout(500);

        // Verify saved to localStorage
        const settings = (await getLocalStorage(page, 'settings')) as { theme?: string } | null;
        expect(settings?.theme).toBe('dark');

        // Reload page
        await page.reload({ waitUntil: 'domcontentloaded' });
        await handleYouTubeConsent(page);
        await page.waitForSelector('ytd-app', { timeout: 15000 });
        await page.evaluate(() => window.scrollTo(0, 500));
        await page.waitForTimeout(2000);

        // Verify setting persisted
        const settingsAfterReload = (await getLocalStorage(page, 'settings')) as {
          theme?: string;
        } | null;
        expect(settingsAfterReload?.theme).toBe('dark');
      }
    }
  });

  test('language setting persists after page reload', async () => {
    const extensionRoot = page.locator('#youtube-comment-navigator-app');
    await expect(extensionRoot).toBeVisible({ timeout: 10000 });

    // Open settings
    const settingsButton = page.locator('[data-testid="settings-button"]');
    await settingsButton.click();
    await page.waitForTimeout(500);

    // Change language
    const languageSelect = page.locator('[data-testid="language-select"]');
    if (await languageSelect.isVisible()) {
      await languageSelect.click();
      await page.waitForTimeout(300);

      const spanishOption = page.locator('[data-testid="option-es"]');
      if (await spanishOption.isVisible()) {
        await spanishOption.click();
        await page.waitForTimeout(500);

        // Reload page
        await page.reload({ waitUntil: 'domcontentloaded' });
        await handleYouTubeConsent(page);
        await page.waitForSelector('ytd-app', { timeout: 15000 });
        await page.evaluate(() => window.scrollTo(0, 500));
        await page.waitForTimeout(2000);

        // Verify setting persisted
        const settingsAfterReload = (await getLocalStorage(page, 'settings')) as {
          language?: string;
        } | null;
        expect(settingsAfterReload?.language).toBe('es');
      }
    }
  });
});
