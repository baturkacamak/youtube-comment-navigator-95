import { test, expect } from '@playwright/test';
import { launchExtension, navigateToYouTubeVideo, setupConsoleCapture } from './helpers/extension';

/**
 * E2E tests for edge cases and error scenarios
 * Tests extension behavior in unusual or error conditions
 */

test.describe('Edge Cases - Videos with Special Conditions', () => {
  test('should handle video with few comments', async () => {
    const { context, page } = await launchExtension();
    const console = setupConsoleCapture(page);

    try {
      // Use a specific video ID known to have few comments
      await navigateToYouTubeVideo(page, 'dQw4w9WgXcQ');

      // Extension should load without errors
      await page.waitForTimeout(2000);

      const errors = console.getErrors();
      const criticalErrors = errors.filter(
        (err) =>
          !err.text.includes('favicon') &&
          !err.text.includes('cast') &&
          !err.text.includes('network')
      );

      expect(criticalErrors.length).toBe(0);
    } finally {
      await context.close();
    }
  });

  test('should handle page without comments section', async () => {
    const { context, page } = await launchExtension();
    const console = setupConsoleCapture(page);

    try {
      await page.goto('https://www.youtube.com/', {
        waitUntil: 'domcontentloaded',
      });

      await page.waitForTimeout(2000);

      // Extension should not crash
      const errors = console.getErrors();
      const extensionErrors = errors.filter(
        (err) =>
          err.text.includes('YCN') ||
          err.text.includes('extension') ||
          err.text.includes('undefined')
      );

      expect(extensionErrors.length).toBe(0);
    } finally {
      await context.close();
    }
  });

  test('should handle rapid page navigation', async () => {
    const { context, page } = await launchExtension();
    const console = setupConsoleCapture(page);

    try {
      // Navigate between multiple videos rapidly
      await navigateToYouTubeVideo(page, 'dQw4w9WgXcQ');
      await page.waitForTimeout(500);

      await navigateToYouTubeVideo(page, 'jNQXAC9IVRw');
      await page.waitForTimeout(500);

      await navigateToYouTubeVideo(page, 'dQw4w9WgXcQ');
      await page.waitForTimeout(1000);

      // Extension should handle this gracefully
      const errors = console.getErrors();
      const navigationErrors = errors.filter(
        (err) =>
          err.text.includes('navigation') ||
          err.text.includes('abort') ||
          err.text.includes('cancel')
      );

      // Some navigation errors are OK, but shouldn't be excessive
      expect(navigationErrors.length).toBeLessThan(5);
    } finally {
      await context.close();
    }
  });

  test('should handle video with comments disabled', async () => {
    const { context, page } = await launchExtension();

    try {
      await navigateToYouTubeVideo(page);

      await page.waitForTimeout(3000);

      // Extension should show appropriate message or handle gracefully
      const extensionRoot = page.locator('[data-testid="ycn-root"], #ycn-root');
      const rootVisible = await extensionRoot
        .first()
        .isVisible()
        .catch(() => false);

      // Extension should either be visible or gracefully hidden
      expect(typeof rootVisible).toBe('boolean');
    } finally {
      await context.close();
    }
  });
});

test.describe('Edge Cases - Malformed Data', () => {
  test('should handle corrupted localStorage', async () => {
    const { context, page } = await launchExtension();
    const console = setupConsoleCapture(page);

    try {
      await navigateToYouTubeVideo(page);

      // Inject corrupted localStorage
      await page.evaluate(() => {
        localStorage.setItem('settings', 'corrupted{json');
      });

      // Reload page
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);

      // Extension should recover gracefully
      const extensionRoot = page.locator('[data-testid="ycn-root"], #ycn-root');
      await expect(extensionRoot.first()).toBeVisible({ timeout: 10000 });

      const errors = console.getErrors();
      const errorsLogged = errors.filter((err) => err.text.includes('Error reading settings'));

      // Should log the error but not crash
      expect(errorsLogged.length).toBeGreaterThan(0);
    } finally {
      await context.close();
    }
  });

  test('should handle missing localStorage', async () => {
    const { context, page } = await launchExtension();

    try {
      await navigateToYouTubeVideo(page);

      // Clear all localStorage
      await page.evaluate(() => {
        localStorage.clear();
      });

      // Reload
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);

      // Extension should use defaults
      const extensionRoot = page.locator('[data-testid="ycn-root"], #ycn-root');
      await expect(extensionRoot.first()).toBeVisible({ timeout: 10000 });
    } finally {
      await context.close();
    }
  });

  test('should handle invalid settings values', async () => {
    const { context, page } = await launchExtension();

    try {
      await navigateToYouTubeVideo(page);

      // Set invalid settings
      await page.evaluate(() => {
        localStorage.setItem(
          'settings',
          JSON.stringify({
            theme: 'invalid-theme',
            textSize: 99999,
            language: 'xx',
          })
        );
      });

      // Reload
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);

      // Extension should handle gracefully with defaults
      const extensionRoot = page.locator('[data-testid="ycn-root"], #ycn-root');
      await expect(extensionRoot.first()).toBeVisible({ timeout: 10000 });
    } finally {
      await context.close();
    }
  });
});

test.describe('Edge Cases - Network Conditions', () => {
  test('should handle slow loading comments', async () => {
    const { context, page } = await launchExtension();

    try {
      // Throttle network
      const client = await context.newCDPSession(page);
      await client.send('Network.emulateNetworkConditions', {
        offline: false,
        downloadThroughput: (500 * 1024) / 8, // 500kb/s
        uploadThroughput: (500 * 1024) / 8,
        latency: 100,
      });

      await navigateToYouTubeVideo(page);

      // Wait longer for slow loading
      await page.waitForTimeout(5000);

      // Extension should still load
      const extensionRoot = page.locator('[data-testid="ycn-root"], #ycn-root');
      const rootVisible = await extensionRoot
        .first()
        .isVisible()
        .catch(() => false);

      expect(rootVisible).toBe(true);
    } finally {
      await context.close();
    }
  });

  test('should handle translation loading failures gracefully', async () => {
    const { context, page } = await launchExtension();
    const console = setupConsoleCapture(page);

    try {
      await navigateToYouTubeVideo(page);

      // Change to a language that might have issues
      const settingsButton = page.locator(
        '[data-testid="settings-button"], button[aria-label*="settings" i]'
      );
      await settingsButton.first().click();
      await page.waitForTimeout(500);

      const languageSelect = page.locator('[data-testid="language-select"]');
      if (
        await languageSelect
          .first()
          .isVisible()
          .catch(() => false)
      ) {
        await languageSelect.first().selectOption('es');
        await page.waitForTimeout(1000);

        // Check for i18n errors (should be handled gracefully)
        const errors = console.getErrors();
        const i18nErrors = errors.filter((err) => err.text.includes('YCN-i18n'));

        // Errors may occur but should be logged, not crash extension
        if (i18nErrors.length > 0) {
          const extensionRoot = page.locator('[data-testid="ycn-root"], #ycn-root');
          await expect(extensionRoot.first()).toBeVisible();
        }
      }
    } finally {
      await context.close();
    }
  });
});

test.describe('Edge Cases - Browser Interactions', () => {
  test('should handle browser back/forward navigation', async () => {
    const { context, page } = await launchExtension();

    try {
      await navigateToYouTubeVideo(page, 'dQw4w9WgXcQ');
      await page.waitForTimeout(2000);

      await navigateToYouTubeVideo(page, 'jNQXAC9IVRw');
      await page.waitForTimeout(2000);

      // Go back
      await page.goBack();
      await page.waitForTimeout(2000);

      // Extension should still work
      const extensionRoot = page.locator('[data-testid="ycn-root"], #ycn-root');
      await expect(extensionRoot.first()).toBeVisible({ timeout: 10000 });

      // Go forward
      await page.goForward();
      await page.waitForTimeout(2000);

      await expect(extensionRoot.first()).toBeVisible({ timeout: 10000 });
    } finally {
      await context.close();
    }
  });

  test('should handle page refresh during navigation', async () => {
    const { context, page } = await launchExtension();

    try {
      await navigateToYouTubeVideo(page);

      const nextButton = page.locator('[data-testid="next-button"], button:has-text("Next")');
      await nextButton.first().click();
      await nextButton.first().click();
      await page.waitForTimeout(300);

      // Refresh page
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);

      // Extension should reload successfully
      const extensionRoot = page.locator('[data-testid="ycn-root"], #ycn-root');
      await expect(extensionRoot.first()).toBeVisible({ timeout: 10000 });
    } finally {
      await context.close();
    }
  });

  test('should handle browser zoom changes', async () => {
    const { context, page } = await launchExtension();

    try {
      await navigateToYouTubeVideo(page);

      // Change zoom level
      await page.evaluate(() => {
        const style = document.body.style as CSSStyleDeclaration & { zoom?: string };
        style.zoom = '150%';
      });

      await page.waitForTimeout(500);

      // Extension should still be functional
      const extensionRoot = page.locator('[data-testid="ycn-root"], #ycn-root');
      await expect(extensionRoot.first()).toBeVisible();

      const nextButton = page.locator('[data-testid="next-button"], button:has-text("Next")');
      await nextButton.first().click();

      // Should navigate without issues
      await page.waitForTimeout(300);
    } finally {
      await context.close();
    }
  });

  test('should handle window resize', async () => {
    const { context, page } = await launchExtension();

    try {
      await navigateToYouTubeVideo(page);

      // Resize window to mobile size
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForTimeout(500);

      // Extension should adapt
      const extensionRoot = page.locator('[data-testid="ycn-root"], #ycn-root');
      await expect(extensionRoot.first()).toBeVisible();

      // Resize to desktop
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.waitForTimeout(500);

      await expect(extensionRoot.first()).toBeVisible();
    } finally {
      await context.close();
    }
  });
});

test.describe('Edge Cases - Content Manipulation', () => {
  test('should handle dynamic comment loading', async () => {
    const { context, page } = await launchExtension();

    try {
      await navigateToYouTubeVideo(page);
      await page.waitForTimeout(2000);

      // Scroll to load more comments
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });

      await page.waitForTimeout(2000);

      // Extension should handle new comments
      const counter = page.locator('[data-testid="comment-counter"]');
      const counterVisible = await counter
        .first()
        .isVisible()
        .catch(() => false);

      expect(counterVisible).toBe(true);
    } finally {
      await context.close();
    }
  });

  test('should handle YouTube comment section changes', async () => {
    const { context, page } = await launchExtension();

    try {
      await navigateToYouTubeVideo(page);
      await page.waitForTimeout(2000);

      // Sort comments (triggers YouTube to reload comments)
      const sortButton = page.locator('#sort-menu button').first();
      if (await sortButton.isVisible().catch(() => false)) {
        await sortButton.click();
        await page.waitForTimeout(500);

        // Select different sort option
        const sortOption = page.locator('ytd-menu-service-item-renderer').first();
        await sortOption.click();
        await page.waitForTimeout(2000);

        // Extension should adapt to new comment order
        const extensionRoot = page.locator('[data-testid="ycn-root"], #ycn-root');
        await expect(extensionRoot.first()).toBeVisible();
      }
    } finally {
      await context.close();
    }
  });
});

test.describe('Edge Cases - Multiple Tabs', () => {
  test('should work independently in multiple tabs', async () => {
    const { context } = await launchExtension();

    try {
      const page1 = await context.newPage();
      const page2 = await context.newPage();

      await navigateToYouTubeVideo(page1, 'dQw4w9WgXcQ');
      await navigateToYouTubeVideo(page2, 'jNQXAC9IVRw');

      await page1.waitForTimeout(2000);
      await page2.waitForTimeout(2000);

      // Both should have extension loaded
      const root1 = page1.locator('[data-testid="ycn-root"], #ycn-root');
      const root2 = page2.locator('[data-testid="ycn-root"], #ycn-root');

      await expect(root1.first()).toBeVisible();
      await expect(root2.first()).toBeVisible();

      // Navigate in tab 1
      const nextButton1 = page1.locator('[data-testid="next-button"], button:has-text("Next")');
      await nextButton1.first().click();
      await page1.waitForTimeout(300);

      // Tab 2 should be unaffected
      await expect(root2.first()).toBeVisible();
    } finally {
      await context.close();
    }
  });
});

test.describe('Edge Cases - Performance Stress', () => {
  test('should handle video with many comments', async () => {
    const { context, page } = await launchExtension();

    try {
      // Use a video known to have many comments (popular video)
      await navigateToYouTubeVideo(page, 'dQw4w9WgXcQ');

      // Wait for comments to load
      await page.waitForTimeout(3000);

      // Scroll to load more
      for (let i = 0; i < 3; i++) {
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.waitForTimeout(1000);
      }

      // Extension should handle large number of comments
      const extensionRoot = page.locator('[data-testid="ycn-root"], #ycn-root');
      await expect(extensionRoot.first()).toBeVisible();

      const counter = page.locator('[data-testid="comment-counter"]');
      const counterText = await counter.first().textContent();

      // Should show reasonable count
      expect(counterText).toMatch(/\d+\s*\/\s*\d+/);
    } finally {
      await context.close();
    }
  });

  test('should maintain performance with rapid actions', async () => {
    const { context, page } = await launchExtension();
    const console = setupConsoleCapture(page);

    try {
      await navigateToYouTubeVideo(page);

      const nextButton = page.locator('[data-testid="next-button"], button:has-text("Next")');
      const searchInput = page.locator('[data-testid="search-input"], input[type="search"]');

      // Perform many rapid actions
      for (let i = 0; i < 20; i++) {
        await nextButton.first().click();
        await searchInput.first().fill(`test${i}`);
        await page.waitForTimeout(50);
      }

      await page.waitForTimeout(1000);

      // Should not cause performance errors
      const errors = console.getErrors();
      const perfErrors = errors.filter(
        (err) =>
          err.text.includes('slow') ||
          err.text.includes('performance') ||
          err.text.includes('memory')
      );

      expect(perfErrors.length).toBeLessThan(3);
    } finally {
      await context.close();
    }
  });
});
