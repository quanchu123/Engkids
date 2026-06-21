import { expect, test } from '@playwright/test';

test('videos page renders and opens a detail page', async ({ page }) => {
  await page.goto('/videos');

  await expect(page.getByTestId('videos-search')).toBeVisible();

  const firstVideoLink = page.locator('a[href^="/videos/"]').first();
  await expect(firstVideoLink).toBeVisible();
  await firstVideoLink.click();

  await expect(page.locator('[data-testid="video-detail-page"], [data-testid="video-processing-state"]')).toBeVisible();

  const player = page.getByTestId('video-learning-player');
  if (await player.count()) {
    await expect(player).toBeVisible();
  }
});
