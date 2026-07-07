import { test, expect, BrowserContext, Page } from '@playwright/test';
import {
  launchExtension,
  handleYouTubeConsent,
  clearLocalStorage,
} from './helpers/extension';

const liveChatVideos = [
  'https://youtu.be/RBt6mn3pyok',
  'https://youtu.be/igS3f2CxINc',
  'https://youtu.be/N2I7gusXX14',
];

const noLiveChatVideo = 'https://youtu.be/dYNLbHUuPRw';

const navigateToYouTubeUrl = async (page: Page, url: string): Promise<void> => {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await handleYouTubeConsent(page);
  await page.waitForSelector('ytd-app', { timeout: 15000 });
  await page.evaluate(() => window.scrollTo(0, 500));
  await page.waitForTimeout(2500);
  await page.waitForSelector('#youtube-comment-navigator-app', {
    timeout: 20000,
    state: 'visible',
  });
};

const openLiveChatTab = async (page: Page): Promise<void> => {
  const liveChatTab = page.getByRole('button', { name: /Live Chat/i }).first();
  await expect(liveChatTab).toBeVisible({ timeout: 10000 });
  await liveChatTab.click();
};

const waitForLiveChatReady = async (page: Page): Promise<void> => {
  await expect
    .poll(
      async () => {
        const messageCount = await page.locator('li[data-message-id]').count();
        const hasEmptyState = await page.getByText('This video has no live chat').isVisible();
        const hasError = await page.getByText('Error loading live chat:').isVisible();

        if (messageCount > 0) return 'messages';
        if (hasEmptyState) return 'empty';
        if (hasError) return 'error';
        return 'pending';
      },
      {
        timeout: 45000,
        intervals: [1000, 2000, 3000],
      }
    )
    .not.toBe('pending');
};

let context: BrowserContext;
let page: Page;

test.describe('Live Chat E2E', () => {
  test.beforeAll(async () => {
    const result = await launchExtension();
    context = result.context;
    page = result.page;
  });

  test.afterAll(async () => {
    await context.close();
  });

  test.beforeEach(async () => {
    await clearLocalStorage(page);
  });

  for (const videoUrl of liveChatVideos) {
    test(`loads replay messages for ${videoUrl}`, async () => {
      await navigateToYouTubeUrl(page, videoUrl);
      await openLiveChatTab(page);
      await waitForLiveChatReady(page);

      await expect(page.locator('[aria-label="Live Chat Transcript"]')).toBeVisible({
        timeout: 10000,
      });

      const messages = page.locator('li[data-message-id]');
      await expect(messages.first()).toBeVisible({ timeout: 20000 });
      expect(await messages.count()).toBeGreaterThan(0);

      const messageTexts = await page
        .locator('li[data-message-id] span.cursor-text')
        .allTextContents();
      const trimmedTexts = messageTexts.map((text) => text.trim()).filter(Boolean);

      expect(trimmedTexts.length).toBeGreaterThan(0);
      expect(trimmedTexts.every((text) => text.length > 0)).toBe(true);
      await expect(page.getByText('This video has no live chat')).toHaveCount(0);
    });
  }

  test('shows empty state for videos without live chat', async () => {
    await navigateToYouTubeUrl(page, noLiveChatVideo);
    await openLiveChatTab(page);
    await waitForLiveChatReady(page);

    await expect(page.getByText('This video has no live chat')).toBeVisible({
      timeout: 20000,
    });
    await expect(page.locator('li[data-message-id]')).toHaveCount(0);
  });
});
