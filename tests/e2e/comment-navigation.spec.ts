import { test, expect } from '@playwright/test';
import { launchExtension, navigateToYouTubeVideo, setupConsoleCapture } from './helpers/extension';

/**
 * E2E tests for comment navigation functionality
 * Tests the core feature of navigating through YouTube comments
 */

test.describe('Comment Navigation E2E', () => {
  test('should display navigation controls', async () => {
    const { context, page } = await launchExtension();

    try {
      await navigateToYouTubeVideo(page);

      // Check for navigation buttons
      const nextButton = page.locator('[data-testid="next-button"], button:has-text("Next")');
      const prevButton = page.locator('[data-testid="prev-button"], button:has-text("Previous")');

      await expect(nextButton.first()).toBeVisible({ timeout: 10000 });
      await expect(prevButton.first()).toBeVisible({ timeout: 10000 });
    } finally {
      await context.close();
    }
  });

  test('should show comment counter', async () => {
    const { context, page } = await launchExtension();

    try {
      await navigateToYouTubeVideo(page);

      // Check for counter display (e.g., "1 / 50")
      const counter = page.locator('[data-testid="comment-counter"]');
      await expect(counter.first()).toBeVisible({ timeout: 10000 });

      const counterText = await counter.first().textContent();
      expect(counterText).toMatch(/\d+\s*\/\s*\d+/);
    } finally {
      await context.close();
    }
  });

  test('should navigate to next comment', async () => {
    const { context, page } = await launchExtension();

    try {
      await navigateToYouTubeVideo(page);

      // Get initial counter
      const counter = page.locator('[data-testid="comment-counter"]');
      const initialText = await counter.first().textContent();

      // Click next button
      const nextButton = page.locator('[data-testid="next-button"], button:has-text("Next")');
      await nextButton.first().click();

      // Wait for counter to update
      await page.waitForTimeout(500);

      const newText = await counter.first().textContent();
      expect(newText).not.toBe(initialText);
    } finally {
      await context.close();
    }
  });

  test('should navigate to previous comment', async () => {
    const { context, page } = await launchExtension();

    try {
      await navigateToYouTubeVideo(page);

      // Navigate forward first
      const nextButton = page.locator('[data-testid="next-button"], button:has-text("Next")');
      await nextButton.first().click();
      await page.waitForTimeout(300);

      // Get counter after moving forward
      const counter = page.locator('[data-testid="comment-counter"]');
      const middleText = await counter.first().textContent();

      // Navigate backward
      const prevButton = page.locator('[data-testid="prev-button"], button:has-text("Previous")');
      await prevButton.first().click();
      await page.waitForTimeout(300);

      const finalText = await counter.first().textContent();
      expect(finalText).not.toBe(middleText);
    } finally {
      await context.close();
    }
  });

  test('should handle rapid navigation clicks', async () => {
    const { context, page } = await launchExtension();
    const console = setupConsoleCapture(page);

    try {
      await navigateToYouTubeVideo(page);

      const nextButton = page.locator('[data-testid="next-button"], button:has-text("Next")');

      // Click multiple times rapidly
      await nextButton.first().click();
      await nextButton.first().click();
      await nextButton.first().click();

      await page.waitForTimeout(500);

      // Check for no errors
      const errors = console.getErrors();
      const navigationErrors = errors.filter(
        (err) => err.text.includes('navigation') || err.text.includes('undefined')
      );

      expect(navigationErrors.length).toBe(0);
    } finally {
      await context.close();
    }
  });

  test('should scroll to comment when navigating', async () => {
    const { context, page } = await launchExtension();

    try {
      await navigateToYouTubeVideo(page);

      // Get initial scroll position
      const initialScroll = await page.evaluate(() => window.scrollY);

      // Navigate to next comment
      const nextButton = page.locator('[data-testid="next-button"], button:has-text("Next")');
      await nextButton.first().click();

      // Wait for scroll
      await page.waitForTimeout(1000);

      const newScroll = await page.evaluate(() => window.scrollY);

      // Scroll position should change
      expect(newScroll).not.toBe(initialScroll);
    } finally {
      await context.close();
    }
  });

  test('should highlight current comment', async () => {
    const { context, page } = await launchExtension();

    try {
      await navigateToYouTubeVideo(page);

      // Look for highlighted comment element
      const highlightedComment = page.locator('.ycn-highlighted, [data-highlighted="true"]');

      await expect(highlightedComment.first()).toBeVisible({ timeout: 10000 });
    } finally {
      await context.close();
    }
  });

  test('should handle videos with no comments', async () => {
    const { context, page } = await launchExtension();

    try {
      // Navigate to a video that might have comments disabled
      await page.goto('https://www.youtube.com/watch?v=test', {
        waitUntil: 'domcontentloaded',
      });

      await page.waitForTimeout(3000);

      // Check if extension handles this gracefully
      const counter = page.locator('[data-testid="comment-counter"]');
      const counterExists = await counter
        .first()
        .isVisible()
        .catch(() => false);

      if (counterExists) {
        const counterText = await counter.first().textContent();
        expect(counterText).toMatch(/0\s*\/\s*0/);
      }
    } finally {
      await context.close();
    }
  });

  test('should update counter correctly during navigation', async () => {
    const { context, page } = await launchExtension();

    try {
      await navigateToYouTubeVideo(page);

      const counter = page.locator('[data-testid="comment-counter"]');
      const nextButton = page.locator('[data-testid="next-button"], button:has-text("Next")');

      // Navigate through several comments
      for (let i = 0; i < 3; i++) {
        await nextButton.first().click();
        await page.waitForTimeout(300);

        const counterText = await counter.first().textContent();
        const match = counterText?.match(/(\d+)\s*\/\s*(\d+)/);

        if (match) {
          const current = parseInt(match[1]);
          const total = parseInt(match[2]);

          expect(current).toBeGreaterThanOrEqual(1);
          expect(current).toBeLessThanOrEqual(total);
        }
      }
    } finally {
      await context.close();
    }
  });

  test('should wrap around when reaching end', async () => {
    const { context, page } = await launchExtension();

    try {
      await navigateToYouTubeVideo(page);

      const counter = page.locator('[data-testid="comment-counter"]');
      const counterText = await counter.first().textContent();
      const match = counterText?.match(/(\d+)\s*\/\s*(\d+)/);

      if (match) {
        const total = parseInt(match[2]);
        const nextButton = page.locator('[data-testid="next-button"], button:has-text("Next")');

        // Navigate to the end
        for (let i = 0; i < total; i++) {
          await nextButton.first().click();
          await page.waitForTimeout(200);
        }

        // Should wrap back to 1
        const finalCounterText = await counter.first().textContent();
        expect(finalCounterText).toMatch(/1\s*\/\s*\d+/);
      }
    } finally {
      await context.close();
    }
  });
});

test.describe('Keyboard Navigation E2E', () => {
  test('should navigate with arrow keys', async () => {
    const { context, page } = await launchExtension();

    try {
      await navigateToYouTubeVideo(page);

      const counter = page.locator('[data-testid="comment-counter"]');
      const initialText = await counter.first().textContent();

      // Press right arrow key
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(300);

      const newText = await counter.first().textContent();
      expect(newText).not.toBe(initialText);
    } finally {
      await context.close();
    }
  });

  test('should navigate with j/k keys', async () => {
    const { context, page } = await launchExtension();

    try {
      await navigateToYouTubeVideo(page);

      const counter = page.locator('[data-testid="comment-counter"]');

      // Press 'j' for next
      await page.keyboard.press('j');
      await page.waitForTimeout(300);

      const afterJ = await counter.first().textContent();

      // Press 'k' for previous
      await page.keyboard.press('k');
      await page.waitForTimeout(300);

      const afterK = await counter.first().textContent();

      expect(afterK).not.toBe(afterJ);
    } finally {
      await context.close();
    }
  });

  test('should jump to first with Home key', async () => {
    const { context, page } = await launchExtension();

    try {
      await navigateToYouTubeVideo(page);

      const nextButton = page.locator('[data-testid="next-button"], button:has-text("Next")');

      // Navigate forward a few times
      await nextButton.first().click();
      await nextButton.first().click();
      await page.waitForTimeout(300);

      // Press Home key
      await page.keyboard.press('Home');
      await page.waitForTimeout(300);

      const counter = page.locator('[data-testid="comment-counter"]');
      const counterText = await counter.first().textContent();

      expect(counterText).toMatch(/1\s*\/\s*\d+/);
    } finally {
      await context.close();
    }
  });

  test('should jump to last with End key', async () => {
    const { context, page } = await launchExtension();

    try {
      await navigateToYouTubeVideo(page);

      // Press End key
      await page.keyboard.press('End');
      await page.waitForTimeout(300);

      const counter = page.locator('[data-testid="comment-counter"]');
      const counterText = await counter.first().textContent();
      const match = counterText?.match(/(\d+)\s*\/\s*(\d+)/);

      if (match) {
        const current = parseInt(match[1]);
        const total = parseInt(match[2]);
        expect(current).toBe(total);
      }
    } finally {
      await context.close();
    }
  });
});

test.describe('Comment Display E2E', () => {
  test('should display comment author', async () => {
    const { context, page } = await launchExtension();

    try {
      await navigateToYouTubeVideo(page);

      // Look for comment author element
      const author = page.locator('[data-testid="comment-author"], .comment-author, #author-text');

      await expect(author.first()).toBeVisible({ timeout: 10000 });
    } finally {
      await context.close();
    }
  });

  test('should display comment text', async () => {
    const { context, page } = await launchExtension();

    try {
      await navigateToYouTubeVideo(page);

      // Look for comment text element
      const commentText = page.locator(
        '[data-testid="comment-text"], .comment-text, #content-text'
      );

      await expect(commentText.first()).toBeVisible({ timeout: 10000 });

      const text = await commentText.first().textContent();
      expect(text?.length).toBeGreaterThan(0);
    } finally {
      await context.close();
    }
  });

  test('should display comment timestamp', async () => {
    const { context, page } = await launchExtension();

    try {
      await navigateToYouTubeVideo(page);

      // Look for timestamp element
      const timestamp = page.locator('[data-testid="comment-timestamp"], .published-time-text');

      const timestampVisible = await timestamp
        .first()
        .isVisible()
        .catch(() => false);
      expect(timestampVisible).toBe(true);
    } finally {
      await context.close();
    }
  });

  test('should display comment likes', async () => {
    const { context, page } = await launchExtension();

    try {
      await navigateToYouTubeVideo(page);

      // Look for likes element
      const likes = page.locator('[data-testid="comment-likes"], #vote-count-middle');

      const likesVisible = await likes
        .first()
        .isVisible()
        .catch(() => false);
      expect(likesVisible).toBe(true);
    } finally {
      await context.close();
    }
  });
});

test.describe('Navigation Performance E2E', () => {
  test('should navigate smoothly without lag', async () => {
    const { context, page } = await launchExtension();

    try {
      await navigateToYouTubeVideo(page);

      const nextButton = page.locator('[data-testid="next-button"], button:has-text("Next")');

      // Measure navigation performance
      const times: number[] = [];

      for (let i = 0; i < 5; i++) {
        const startTime = Date.now();
        await nextButton.first().click();
        await page.waitForTimeout(100);
        const endTime = Date.now();

        times.push(endTime - startTime);
      }

      // Average time should be reasonable
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      expect(avgTime).toBeLessThan(1000); // Less than 1 second on average
    } finally {
      await context.close();
    }
  });

  test('should not freeze page during navigation', async () => {
    const { context, page } = await launchExtension();
    const console = setupConsoleCapture(page);

    try {
      await navigateToYouTubeVideo(page);

      const nextButton = page.locator('[data-testid="next-button"], button:has-text("Next")');

      // Navigate rapidly
      for (let i = 0; i < 10; i++) {
        await nextButton.first().click();
      }

      await page.waitForTimeout(1000);

      // Page should still be responsive
      const videoTitle = page.locator('h1.ytd-video-primary-info-renderer');
      await expect(videoTitle.first()).toBeVisible();

      // Check for performance warnings
      const errors = console.getErrors();
      const performanceErrors = errors.filter(
        (err) =>
          err.text.includes('slow') ||
          err.text.includes('performance') ||
          err.text.includes('timeout')
      );

      expect(performanceErrors.length).toBe(0);
    } finally {
      await context.close();
    }
  });
});
