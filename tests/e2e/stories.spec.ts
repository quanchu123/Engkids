import { expect, test } from '@playwright/test';

test('stories page renders and supports deep-link browsing', async ({ page }) => {
  await page.goto('/stories');

  await expect(page.getByTestId('stories-search')).toBeVisible();

  const firstStoryLink = page.locator('a[href^="/stories/"]').first();
  await expect(firstStoryLink).toBeVisible();
  await firstStoryLink.click();

  await expect(page.getByTestId('story-reader')).toBeVisible();
  await expect(page.getByTestId('story-vocab-link')).toBeVisible();
  await expect(page.getByTestId('story-games-link')).toBeVisible();
});
