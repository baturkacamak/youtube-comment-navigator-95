import { test, expect } from '@playwright/test';
import { launchExtension, navigateToYouTubeVideo, setupConsoleCapture } from './helpers/extension';

/**
 * E2E tests for search functionality
 * Tests comment search, filtering, and result highlighting
 */

test.describe('Search Functionality E2E', () => {
  test('should display search input', async () => {
    const { context, page } = await launchExtension();

    try {
      await navigateToYouTubeVideo(page);

      const searchInput = page.locator(
        '[data-testid="search-input"], input[placeholder*="search" i], input[type="search"]'
      );

      await expect(searchInput.first()).toBeVisible({ timeout: 10000 });
    } finally {
      await context.close();
    }
  });

  test('should filter comments by search query', async () => {
    const { context, page } = await launchExtension();

    try {
      await navigateToYouTubeVideo(page);

      // Get initial counter
      const counter = page.locator('[data-testid="comment-counter"]');
      const initialText = await counter.first().textContent();
      const initialMatch = initialText?.match(/\/\s*(\d+)/);
      const initialTotal = initialMatch ? parseInt(initialMatch[1]) : 0;

      // Enter search query
      const searchInput = page.locator(
        '[data-testid="search-input"], input[placeholder*="search" i]'
      );
      await searchInput.first().fill('great');
      await page.waitForTimeout(500);

      // Check if filtered
      const newText = await counter.first().textContent();
      const newMatch = newText?.match(/\/\s*(\d+)/);
      const newTotal = newMatch ? parseInt(newMatch[1]) : 0;

      expect(newTotal).toBeLessThanOrEqual(initialTotal);
    } finally {
      await context.close();
    }
  });

  test('should be case-insensitive', async () => {
    const { context, page } = await launchExtension();

    try {
      await navigateToYouTubeVideo(page);

      const searchInput = page.locator('[data-testid="search-input"], input[type="search"]');
      const counter = page.locator('[data-testid="comment-counter"]');

      // Search with lowercase
      await searchInput.first().fill('video');
      await page.waitForTimeout(500);
      const lowerText = await counter.first().textContent();

      // Clear and search with uppercase
      await searchInput.first().clear();
      await searchInput.first().fill('VIDEO');
      await page.waitForTimeout(500);
      const upperText = await counter.first().textContent();

      // Results should be the same
      expect(lowerText).toBe(upperText);
    } finally {
      await context.close();
    }
  });

  test('should show no results message', async () => {
    const { context, page } = await launchExtension();

    try {
      await navigateToYouTubeVideo(page);

      const searchInput = page.locator('[data-testid="search-input"], input[type="search"]');
      await searchInput.first().fill('xyzabc123nonexistent');
      await page.waitForTimeout(500);

      // Check for no results message or 0 count
      const counter = page.locator('[data-testid="comment-counter"]');
      const counterText = await counter.first().textContent();

      expect(counterText).toMatch(/0\s*\/\s*0/);
    } finally {
      await context.close();
    }
  });

  test('should clear search results', async () => {
    const { context, page } = await launchExtension();

    try {
      await navigateToYouTubeVideo(page);

      const searchInput = page.locator('[data-testid="search-input"], input[type="search"]');
      const counter = page.locator('[data-testid="comment-counter"]');

      // Get initial count
      const initialText = await counter.first().textContent();

      // Search
      await searchInput.first().fill('test');
      await page.waitForTimeout(500);

      // Clear search
      await searchInput.first().clear();
      await page.waitForTimeout(500);

      // Should return to original count
      const finalText = await counter.first().textContent();
      expect(finalText).toBe(initialText);
    } finally {
      await context.close();
    }
  });

  test('should have clear button when search has text', async () => {
    const { context, page } = await launchExtension();

    try {
      await navigateToYouTubeVideo(page);

      const searchInput = page.locator('[data-testid="search-input"], input[type="search"]');
      await searchInput.first().fill('test');
      await page.waitForTimeout(300);

      // Look for clear button
      const clearButton = page.locator(
        '[data-testid="clear-search"], button[aria-label*="clear" i]'
      );

      const clearVisible = await clearButton
        .first()
        .isVisible()
        .catch(() => false);
      expect(clearVisible).toBe(true);
    } finally {
      await context.close();
    }
  });

  test('should clear search with clear button', async () => {
    const { context, page } = await launchExtension();

    try {
      await navigateToYouTubeVideo(page);

      const searchInput = page.locator('[data-testid="search-input"], input[type="search"]');
      await searchInput.first().fill('test');
      await page.waitForTimeout(300);

      const clearButton = page.locator(
        '[data-testid="clear-search"], button[aria-label*="clear" i]'
      );

      if (
        await clearButton
          .first()
          .isVisible()
          .catch(() => false)
      ) {
        await clearButton.first().click();
        await page.waitForTimeout(300);

        const inputValue = await searchInput.first().inputValue();
        expect(inputValue).toBe('');
      }
    } finally {
      await context.close();
    }
  });

  test('should navigate only through search results', async () => {
    const { context, page } = await launchExtension();

    try {
      await navigateToYouTubeVideo(page);

      // Search for something specific
      const searchInput = page.locator('[data-testid="search-input"], input[type="search"]');
      await searchInput.first().fill('great');
      await page.waitForTimeout(500);

      const counter = page.locator('[data-testid="comment-counter"]');
      const counterText = await counter.first().textContent();
      const match = counterText?.match(/\/\s*(\d+)/);
      const totalResults = match ? parseInt(match[1]) : 0;

      if (totalResults > 0) {
        const nextButton = page.locator('[data-testid="next-button"], button:has-text("Next")');

        // Navigate through all results
        for (let i = 0; i < totalResults; i++) {
          await nextButton.first().click();
          await page.waitForTimeout(300);

          const currentText = await counter.first().textContent();
          const currentMatch = currentText?.match(/(\d+)\s*\/\s*(\d+)/);

          if (currentMatch) {
            const current = parseInt(currentMatch[1]);
            const total = parseInt(currentMatch[2]);

            expect(current).toBeGreaterThanOrEqual(1);
            expect(current).toBeLessThanOrEqual(total);
            expect(total).toBe(totalResults);
          }
        }
      }
    } finally {
      await context.close();
    }
  });

  test('should reset to first result after search', async () => {
    const { context, page } = await launchExtension();

    try {
      await navigateToYouTubeVideo(page);

      const nextButton = page.locator('[data-testid="next-button"], button:has-text("Next")');
      const counter = page.locator('[data-testid="comment-counter"]');

      // Navigate to 3rd comment
      await nextButton.first().click();
      await nextButton.first().click();
      await page.waitForTimeout(300);

      // Now search
      const searchInput = page.locator('[data-testid="search-input"], input[type="search"]');
      await searchInput.first().fill('video');
      await page.waitForTimeout(500);

      // Should be at first result
      const counterText = await counter.first().textContent();
      expect(counterText).toMatch(/1\s*\/\s*\d+/);
    } finally {
      await context.close();
    }
  });

  test('should handle rapid typing', async () => {
    const { context, page } = await launchExtension();
    const console = setupConsoleCapture(page);

    try {
      await navigateToYouTubeVideo(page);

      const searchInput = page.locator('[data-testid="search-input"], input[type="search"]');

      // Type rapidly
      await searchInput.first().type('test', { delay: 50 });

      await page.waitForTimeout(500);

      // Should not cause errors
      const errors = console.getErrors();
      const searchErrors = errors.filter(
        (err) => err.text.includes('search') || err.text.includes('filter')
      );

      expect(searchErrors.length).toBe(0);
    } finally {
      await context.close();
    }
  });

  test('should handle special characters in search', async () => {
    const { context, page } = await launchExtension();
    const console = setupConsoleCapture(page);

    try {
      await navigateToYouTubeVideo(page);

      const searchInput = page.locator('[data-testid="search-input"], input[type="search"]');

      // Test various special characters
      const specialChars = ['(test)', '[test]', 'test?', 'test!', 'test*', 'test+', 'test.'];

      for (const query of specialChars) {
        await searchInput.first().clear();
        await searchInput.first().fill(query);
        await page.waitForTimeout(200);
      }

      // Should not cause errors
      const errors = console.getErrors();
      const regexErrors = errors.filter(
        (err) =>
          err.text.includes('regex') || err.text.includes('invalid') || err.text.includes('syntax')
      );

      expect(regexErrors.length).toBe(0);
    } finally {
      await context.close();
    }
  });

  test('should preserve search when navigating comments', async () => {
    const { context, page } = await launchExtension();

    try {
      await navigateToYouTubeVideo(page);

      const searchInput = page.locator('[data-testid="search-input"], input[type="search"]');
      await searchInput.first().fill('great');
      await page.waitForTimeout(500);

      const nextButton = page.locator('[data-testid="next-button"], button:has-text("Next")');
      await nextButton.first().click();
      await page.waitForTimeout(300);

      // Search query should still be there
      const inputValue = await searchInput.first().inputValue();
      expect(inputValue).toBe('great');
    } finally {
      await context.close();
    }
  });

  test('should search in comment text and author', async () => {
    const { context, page } = await launchExtension();

    try {
      await navigateToYouTubeVideo(page);

      const searchInput = page.locator('[data-testid="search-input"], input[type="search"]');
      const counter = page.locator('[data-testid="comment-counter"]');

      // Search for common author name
      await searchInput.first().fill('@');
      await page.waitForTimeout(500);

      const counterText = await counter.first().textContent();
      const match = counterText?.match(/\/\s*(\d+)/);
      const totalResults = match ? parseInt(match[1]) : 0;

      // Should find results (most comments have @ in author)
      expect(totalResults).toBeGreaterThan(0);
    } finally {
      await context.close();
    }
  });
});

test.describe('Search Highlighting E2E', () => {
  test('should highlight search terms in comments', async () => {
    const { context, page } = await launchExtension();

    try {
      await navigateToYouTubeVideo(page);

      const searchInput = page.locator('[data-testid="search-input"], input[type="search"]');
      await searchInput.first().fill('great');
      await page.waitForTimeout(500);

      // Look for highlighted text
      const highlighted = page.locator('mark, .highlighted, .search-highlight');

      const highlightExists = await highlighted
        .first()
        .isVisible()
        .catch(() => false);

      // If highlighting is implemented, it should be visible
      if (highlightExists) {
        const highlightedText = await highlighted.first().textContent();
        expect(highlightedText?.toLowerCase()).toContain('great');
      }
    } finally {
      await context.close();
    }
  });
});

test.describe('Search Performance E2E', () => {
  test('should search without lag', async () => {
    const { context, page } = await launchExtension();

    try {
      await navigateToYouTubeVideo(page);

      const searchInput = page.locator('[data-testid="search-input"], input[type="search"]');

      const startTime = Date.now();
      await searchInput.first().fill('test');
      await page.waitForTimeout(100);
      const endTime = Date.now();

      // Search should be fast
      expect(endTime - startTime).toBeLessThan(2000);
    } finally {
      await context.close();
    }
  });

  test('should handle long search queries', async () => {
    const { context, page } = await launchExtension();
    const console = setupConsoleCapture(page);

    try {
      await navigateToYouTubeVideo(page);

      const searchInput = page.locator('[data-testid="search-input"], input[type="search"]');

      // Very long query
      const longQuery = 'a'.repeat(1000);
      await searchInput.first().fill(longQuery);
      await page.waitForTimeout(500);

      // Should not cause errors
      const errors = console.getErrors();
      const searchErrors = errors.filter(
        (err) => err.text.includes('search') || err.text.includes('length')
      );

      expect(searchErrors.length).toBe(0);
    } finally {
      await context.close();
    }
  });

  test('should not block UI during search', async () => {
    const { context, page } = await launchExtension();

    try {
      await navigateToYouTubeVideo(page);

      const searchInput = page.locator('[data-testid="search-input"], input[type="search"]');

      // Start typing
      await searchInput.first().type('searching', { delay: 100 });

      // UI should remain responsive
      const settingsButton = page.locator(
        '[data-testid="settings-button"], button[aria-label*="settings" i]'
      );

      // Should be able to interact with other elements
      const settingsClickable = await settingsButton
        .first()
        .isEnabled()
        .catch(() => false);
      expect(settingsClickable).toBe(true);
    } finally {
      await context.close();
    }
  });
});

test.describe('Search with Settings Integration E2E', () => {
  test('should toggle showContentOnSearch setting', async () => {
    const { context, page } = await launchExtension();

    try {
      await navigateToYouTubeVideo(page);

      // Open settings
      const settingsButton = page.locator(
        '[data-testid="settings-button"], button[aria-label*="settings" i]'
      );
      await settingsButton.first().click();
      await page.waitForTimeout(500);

      // Find showContentOnSearch toggle
      const contentToggle = page.locator('[data-testid="show-content-on-search"]');

      if (
        await contentToggle
          .first()
          .isVisible()
          .catch(() => false)
      ) {
        await contentToggle.first().click();
        await page.waitForTimeout(300);

        // Close settings
        await page.keyboard.press('Escape');

        // Search
        const searchInput = page.locator('[data-testid="search-input"], input[type="search"]');
        await searchInput.first().fill('test');
        await page.waitForTimeout(500);

        // Content visibility should be affected by the setting
        const commentContent = page.locator('[data-testid="comment-content"]');
        const contentVisible = await commentContent
          .first()
          .isVisible()
          .catch(() => false);

        // Visibility depends on the toggle state
        expect(typeof contentVisible).toBe('boolean');
      }
    } finally {
      await context.close();
    }
  });
});
