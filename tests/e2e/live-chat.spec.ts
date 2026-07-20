import { test, expect, BrowserContext, Page } from '@playwright/test';
import { launchExtension, handleYouTubeConsent, clearLocalStorage } from './helpers/extension';

const liveChatVideos = [
  'https://youtu.be/RBt6mn3pyok',
  'https://youtu.be/igS3f2CxINc',
  'https://youtu.be/N2I7gusXX14',
];

const noLiveChatVideo = 'https://youtu.be/dYNLbHUuPRw';
const interactiveLiveChatVideo = 'https://youtu.be/eqKE9As_sD4';
const spaNavigationLiveChatVideoId = 'Iu4hiStcjpo';

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
  const liveChatTab = page.getByRole('button', { name: /^Live Chat(?: \(\d+\))?$/i }).first();
  await expect(liveChatTab).toBeVisible({ timeout: 10000 });
  await liveChatTab.evaluate((button) => button.click());
};

const loadLiveChat = async (page: Page): Promise<void> => {
  const loadButton = page.getByRole('button', { name: /Load Live Chat/i });
  await expect(loadButton).toBeVisible({ timeout: 10000 });
  await loadButton.evaluate((button) => button.click());
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

const waitForLiveChatMessages = async (page: Page, timeout: number = 60000): Promise<void> => {
  await expect
    .poll(() => page.locator('li[data-message-id]').count(), {
      timeout,
      intervals: [1000, 2000, 3000],
    })
    .toBeGreaterThan(0);
};

const getLaterLoadedChatMessage = async (
  page: Page,
  minimumIndex: number,
  minimumVideoOffsetTime: number
): Promise<{ messageId: string; videoOffsetTimeSec: number } | null> => {
  return page.evaluate(
    async ({ index, videoOffsetTime }) => {
      return new Promise((resolve, reject) => {
        const openRequest = indexedDB.open('youtube-comment-navigator-95');
        openRequest.onerror = () => reject(openRequest.error);
        openRequest.onsuccess = () => {
          const database = openRequest.result;
          const request = database
            .transaction('liveChatMessages', 'readonly')
            .objectStore('liveChatMessages')
            .getAll();

          request.onerror = () => reject(request.error);
          request.onsuccess = () => {
            database.close();
            const messages = request.result
              .filter((message) => typeof message.videoOffsetTimeSec === 'number')
              .sort((first, second) => first.timestampMs - second.timestampMs);
            for (let messageIndex = messages.length - 1; messageIndex >= index; messageIndex--) {
              if (messages[messageIndex].videoOffsetTimeSec > videoOffsetTime) {
                resolve(messages[messageIndex]);
                return;
              }
            }
            resolve(null);
          };
        };
      });
    },
    { index: minimumIndex, videoOffsetTime: minimumVideoOffsetTime }
  ) as Promise<{
    messageId: string;
    videoOffsetTimeSec: number;
  } | null>;
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

  test('loads chat replay after YouTube SPA navigation from the homepage', async () => {
    test.setTimeout(180000);

    await page.goto('https://www.youtube.com/', { waitUntil: 'domcontentloaded' });
    await handleYouTubeConsent(page);
    await page.waitForSelector('ytd-app', { timeout: 15000 });

    await page.goto(
      `https://www.youtube.com/results?search_query=${spaNavigationLiveChatVideoId}`,
      {
        waitUntil: 'domcontentloaded',
      }
    );
    await page.waitForSelector(`a[href^="/watch?v=${spaNavigationLiveChatVideoId}"]`, {
      timeout: 30000,
    });

    await page.locator(`a[href^="/watch?v=${spaNavigationLiveChatVideoId}"]`).first().click();
    await expect(page).toHaveURL(new RegExp(`watch\\?v=${spaNavigationLiveChatVideoId}`), {
      timeout: 30000,
    });
    await page.evaluate(() => window.scrollTo(0, 500));
    await page.waitForSelector('#youtube-comment-navigator-app', {
      timeout: 30000,
      state: 'visible',
    });

    await openLiveChatTab(page);
    await waitForLiveChatMessages(page, 120000);
    await expect(page.getByText('Error loading live chat:')).toHaveCount(0);
  });

  test('shows empty state for videos without live chat', async () => {
    await navigateToYouTubeUrl(page, noLiveChatVideo);
    await openLiveChatTab(page);
    await waitForLiveChatReady(page);

    await expect(page.getByText('This video has no live chat')).toBeVisible({
      timeout: 20000,
    });
    await expect(page.locator('li[data-message-id]')).toHaveCount(0);
  });

  test('links chat authors and follows the video timeline when auto-scroll is enabled', async () => {
    test.setTimeout(120000);
    await navigateToYouTubeUrl(page, interactiveLiveChatVideo);
    await loadLiveChat(page);
    await openLiveChatTab(page);
    await waitForLiveChatMessages(page);

    const messages = page.locator('li[data-message-id][data-video-offset-time]');
    await expect(messages).not.toHaveCount(0);

    const authorLink = messages.first().locator('a[href^="https://www.youtube.com/channel/"]');
    await expect(authorLink).toBeVisible();
    await expect(authorLink).toHaveAttribute('target', '_blank');
    await expect(authorLink).toHaveAttribute('rel', 'noopener noreferrer');

    const transcript = page.locator('[aria-label="Live Chat Transcript"] ul');
    await transcript.evaluate((element) => {
      element.scrollTop = 0;
    });

    const initialMessageCount = await messages.count();
    const lastLoadedTime = Number(await messages.last().getAttribute('data-video-offset-time'));
    const targetMessage = await getLaterLoadedChatMessage(
      page,
      initialMessageCount,
      lastLoadedTime
    );
    expect(targetMessage).not.toBeNull();
    const targetTime = targetMessage!.videoOffsetTimeSec;
    expect(targetTime).toBeGreaterThanOrEqual(0);

    const autoScrollCheckbox = page.getByRole('checkbox', { name: /Auto-scroll/i });
    await autoScrollCheckbox.evaluate((checkbox) => (checkbox as HTMLInputElement).click());
    const pageScrollTop = await page.evaluate(() => window.scrollY);
    await page.locator('#movie_player video, video.html5-main-video').evaluate((video, time) => {
      video.currentTime = time;
      video.dispatchEvent(new Event('timeupdate'));
    }, targetTime);

    await expect
      .poll(() => messages.count(), { timeout: 20000 })
      .toBeGreaterThan(initialMessageCount);
    await expect(page.locator(`li[data-message-id="${targetMessage!.messageId}"]`)).toBeVisible({
      timeout: 20000,
    });
    await expect
      .poll(() => transcript.evaluate((element) => element.scrollTop), { timeout: 5000 })
      .toBeGreaterThan(0);
    await expect
      .poll(() => page.evaluate(() => window.scrollY), { timeout: 5000 })
      .toBe(pageScrollTop);
  });
});
