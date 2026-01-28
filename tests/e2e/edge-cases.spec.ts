import { test, expect } from '@playwright/test';
import {
  launchExtension,
  navigateToYouTubeVideo,
  handleYouTubeConsent,
  testVideos,
} from './helpers/extension';

/**
 * E2E tests for edge cases - ESSENTIAL BROWSER TESTS ONLY
 * Tests that require real browser behavior (navigation, multiple tabs, etc.)
 * Most edge cases are tested in integration tests
 */

test.describe('Edge Cases - Browser Specific', () => {
  test('extension handles YouTube homepage (no comments section)', async () => {
    const { context, page } = await launchExtension();

    try {
      await page.goto('https://www.youtube.com/', {
        waitUntil: 'domcontentloaded',
      });
      await handleYouTubeConsent(page);
      await page.waitForTimeout(3000);

      // Extension should not crash on homepage
      // It may or may not be visible depending on implementation
      const errors = await page.evaluate(() => {
        // Check for any extension-related errors in the page
        return (window as any).__ycnErrors || [];
      });

      // No critical errors
      expect(errors.length).toBe(0);
    } finally {
      await context.close();
    }
  });

  test('extension handles browser back/forward navigation', async () => {
    const { context, page } = await launchExtension();

    try {
      // Navigate to first video
      await navigateToYouTubeVideo(page, testVideos[0].id);
      await page.waitForTimeout(2000);

      // Navigate to second video
      await navigateToYouTubeVideo(page, 'jNQXAC9IVRw');
      await page.waitForTimeout(2000);

      // Go back
      await page.goBack();
      await page.waitForTimeout(3000);

      // Extension should still work
      const extensionRoot = page.locator('#youtube-comment-navigator-app');
      await expect(extensionRoot).toBeVisible({ timeout: 15000 });
    } finally {
      await context.close();
    }
  });

  test('extension works independently in multiple tabs', async () => {
    const { context } = await launchExtension();

    try {
      const page1 = await context.newPage();
      const page2 = await context.newPage();

      await navigateToYouTubeVideo(page1, testVideos[0].id);
      await navigateToYouTubeVideo(page2, 'jNQXAC9IVRw');

      await page1.waitForTimeout(3000);
      await page2.waitForTimeout(3000);

      // Both should have extension loaded
      const root1 = page1.locator('#youtube-comment-navigator-app');
      const root2 = page2.locator('#youtube-comment-navigator-app');

      await expect(root1).toBeVisible({ timeout: 15000 });
      await expect(root2).toBeVisible({ timeout: 15000 });
    } finally {
      await context.close();
    }
  });
});
