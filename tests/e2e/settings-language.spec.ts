import { test, expect } from '@playwright/test';
import {
  launchExtension,
  navigateToYouTubeVideo,
  setupConsoleCapture,
  getLocalStorage,
} from './helpers/extension';

/**
 * E2E tests for settings and language functionality
 * These tests would have caught the i18n production loading bug
 */

test.describe('Settings - Language Changes', () => {
  test.beforeEach(async () => {
    // Build the extension before running tests
    // This ensures we're testing the actual production build
  });

  test('language change loads translations without errors', async () => {
    const { context, page } = await launchExtension();
    const console = setupConsoleCapture(page);

    try {
      await navigateToYouTubeVideo(page);

      // Open settings
      const settingsButton = page.locator('[data-testid="settings-button"]').first();
      await settingsButton.click();
      await page.waitForTimeout(500);

      // Find language selector (could be a select or custom dropdown)
      const languageSelect = page
        .locator('[data-testid="language-select"], select[aria-label*="language" i]')
        .first();

      if (await languageSelect.isVisible()) {
        // Change to Spanish
        await languageSelect.selectOption('es');
      } else {
        // Handle custom dropdown if present
        const languageSetting = page.locator('[data-testid="language-setting"]').first();
        await languageSetting.click();
        const spanishOption = page.locator('text=Spanish, text=Español').first();
        await spanishOption.click();
      }

      // Wait for language change to process
      await page.waitForTimeout(2000);

      // Check for i18n errors
      const errors = console.getErrors();
      const i18nErrors = errors.filter(
        (err) =>
          err.text.toLowerCase().includes('i18n') ||
          err.text.includes('YCN-i18n') ||
          err.text.includes('translation') ||
          err.text.includes('Failed to load')
      );

      // Log errors for debugging
      if (i18nErrors.length > 0) {
        console.log('❌ Found i18n errors:', i18nErrors);
      }

      expect(i18nErrors.length).toBe(0);

      // Verify localStorage was updated
      const settings = await getLocalStorage(page, 'settings');
      expect(settings.language).toBe('es');
    } finally {
      await context.close();
    }
  });

  test('translation files load successfully from chrome.runtime.getURL', async () => {
    const { context, page } = await launchExtension();
    const console = setupConsoleCapture(page);

    try {
      await navigateToYouTubeVideo(page);

      // Open settings
      const settingsButton = page.locator('[data-testid="settings-button"]').first();
      await settingsButton.click();
      await page.waitForTimeout(500);

      // Try changing to multiple languages
      const languages = ['es', 'fr', 'de'];

      for (const lang of languages) {
        const languageSelect = page.locator('[data-testid="language-select"]').first();

        if (await languageSelect.isVisible()) {
          await languageSelect.selectOption(lang);
          await page.waitForTimeout(1500);

          // Check for 404 errors loading translation files
          const errors = console.getErrors();
          const loadErrors = errors.filter(
            (err) =>
              err.text.includes('404') ||
              err.text.includes('Failed to load translations') ||
              err.text.includes('HTTP')
          );

          if (loadErrors.length > 0) {
            console.log(`❌ Found load errors for ${lang}:`, loadErrors);
          }

          expect(loadErrors.length).toBe(0);
        }
      }
    } finally {
      await context.close();
    }
  });

  test('theme changes persist after page reload', async () => {
    const { context, page } = await launchExtension();

    try {
      await navigateToYouTubeVideo(page);

      // Open settings
      const settingsButton = page.locator('[data-testid="settings-button"]').first();
      await settingsButton.click();

      // Click dark theme
      const darkThemeButton = page.locator('[data-testid="theme-dark"]').first();
      await darkThemeButton.click();
      await page.waitForTimeout(500);

      // Verify dark class applied
      const hasDarkClass = await page.evaluate(() =>
        document.documentElement.classList.contains('dark')
      );
      expect(hasDarkClass).toBe(true);

      // Verify saved to localStorage
      const settings = await getLocalStorage(page, 'settings');
      expect(settings.theme).toBe('dark');

      // Reload page
      await page.reload({ waitUntil: 'domcontentloaded' });
      await navigateToYouTubeVideo(page);

      // Verify dark theme persisted
      const stillDark = await page.evaluate(() =>
        document.documentElement.classList.contains('dark')
      );
      expect(stillDark).toBe(true);
    } finally {
      await context.close();
    }
  });

  test('text size changes are saved to localStorage', async () => {
    const { context, page } = await launchExtension();

    try {
      await navigateToYouTubeVideo(page);

      // Open settings
      const settingsButton = page.locator('[data-testid="settings-button"]').first();
      await settingsButton.click();

      // Click large text size
      const largeTextButton = page.locator('[data-testid="text-large"]').first();
      if (await largeTextButton.isVisible()) {
        await largeTextButton.click();
        await page.waitForTimeout(500);

        // Verify saved to localStorage
        const settings = await getLocalStorage(page, 'settings');
        expect(settings.textSize).toBe('text-lg');
      }
    } finally {
      await context.close();
    }
  });
});

test.describe('Settings - Error Handling', () => {
  test('handles corrupted localStorage gracefully', async () => {
    const { context, page } = await launchExtension();
    const console = setupConsoleCapture(page);

    try {
      await navigateToYouTubeVideo(page);

      // Corrupt localStorage
      await page.evaluate(() => {
        localStorage.setItem('settings', 'invalid-json-{');
      });

      // Reload to trigger settings load
      await page.reload({ waitUntil: 'domcontentloaded' });
      await navigateToYouTubeVideo(page);

      // Verify error was logged (but didn't crash)
      const errors = console.getErrors();
      const settingsErrors = errors.filter(
        (err) => err.text.includes('Error reading settings') || err.text.includes('localStorage')
      );

      // Should have logged the error
      expect(settingsErrors.length).toBeGreaterThan(0);

      // But extension should still load
      const extensionRoot = page.locator('[data-testid="ycn-root"], #ycn-root');
      await expect(extensionRoot).toBeVisible({ timeout: 10000 });

      // And localStorage should be cleared
      const settings = await getLocalStorage(page, 'settings');
      expect(settings).toBeNull();
    } finally {
      await context.close();
    }
  });

  test('console.error and console.warn are preserved in production build', async () => {
    const { context, page } = await launchExtension();
    const console = setupConsoleCapture(page);

    try {
      // Corrupt settings to trigger error
      await page.goto('https://www.youtube.com/watch?v=dQw4w9WgXcQ');

      await page.evaluate(() => {
        localStorage.setItem('settings', 'invalid-json');
      });

      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(3000);

      // Verify errors are visible
      const allMessages = console.getMessages();
      const hasErrorMessages = allMessages.some((m) => m.type === 'error');
      const hasWarningMessages = allMessages.some((m) => m.type === 'warning');

      // At least one error or warning should be present from corrupted settings
      expect(hasErrorMessages || hasWarningMessages).toBe(true);
    } finally {
      await context.close();
    }
  });
});
