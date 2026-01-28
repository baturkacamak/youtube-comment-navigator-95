import { test, expect } from '@playwright/test';
import { launchExtension, navigateToYouTubeVideo, setupConsoleCapture } from './helpers/extension';

/**
 * E2E tests for basic extension loading and initialization
 */

test.describe('Extension Loading', () => {
  test('extension loads on YouTube video page', async () => {
    const { context, page } = await launchExtension();

    try {
      await navigateToYouTubeVideo(page);

      // Verify extension UI is injected
      const extensionRoot = page.locator('[data-testid="ycn-root"], #ycn-root');
      await expect(extensionRoot).toBeAttached({ timeout: 15000 });

      // Verify extension is visible
      const isVisible = await extensionRoot.isVisible();
      expect(isVisible).toBe(true);
    } finally {
      await context.close();
    }
  });

  test('extension initializes without console errors', async () => {
    const { context, page } = await launchExtension();
    const console = setupConsoleCapture(page);

    try {
      await navigateToYouTubeVideo(page);

      // Wait a bit for initialization
      await page.waitForTimeout(3000);

      // Check for critical errors (excluding expected warnings)
      const errors = console.getErrors();
      const criticalErrors = errors.filter((err) => {
        // Filter out expected/benign errors
        const text = err.text.toLowerCase();
        return (
          !text.includes('favicon') &&
          !text.includes('net::err') &&
          !text.includes('service worker')
        );
      });

      expect(criticalErrors.length).toBe(0);
    } finally {
      await context.close();
    }
  });

  test('extension displays search input', async () => {
    const { context, page } = await launchExtension();

    try {
      await navigateToYouTubeVideo(page);

      // Look for search input
      const searchInput = page.locator(
        'input[placeholder*="Search"], input[data-testid*="search"]'
      );
      await expect(searchInput.first()).toBeVisible({ timeout: 10000 });
    } finally {
      await context.close();
    }
  });

  test('extension displays settings button', async () => {
    const { context, page } = await launchExtension();

    try {
      await navigateToYouTubeVideo(page);

      // Look for settings button
      const settingsButton = page.locator(
        '[data-testid="settings-button"], button[aria-label*="settings" i]'
      );
      await expect(settingsButton.first()).toBeVisible({ timeout: 10000 });
    } finally {
      await context.close();
    }
  });
});
