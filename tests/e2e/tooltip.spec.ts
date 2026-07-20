import { test, expect } from '@playwright/test';
import { launchExtension, navigateToYouTubeVideo } from './helpers/extension';

test('renders a tooltip above overflow-hidden containers and inside the viewport', async () => {
  const { context, page } = await launchExtension();
  try {
    await navigateToYouTubeVideo(page);
    await page.locator('[data-testid="settings-button"]').hover();
    const tooltip = page.locator('#ycn-tooltip');
    await expect(tooltip).toBeVisible();
    const presentation = await tooltip.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        fontSize: Number.parseFloat(style.fontSize),
        paddingTop: Number.parseFloat(style.paddingTop),
        background: style.backgroundColor,
      };
    });
    expect(presentation.fontSize).toBeGreaterThanOrEqual(12);
    expect(presentation.paddingTop).toBeGreaterThanOrEqual(4);
    expect(presentation.background).not.toBe('rgba(0, 0, 0, 0)');
    const box = await tooltip.boundingBox();
    const viewport = page.viewportSize();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(viewport!.width);
    expect(box!.y + box!.height).toBeLessThanOrEqual(viewport!.height);
  } finally {
    await context.close();
  }
});
