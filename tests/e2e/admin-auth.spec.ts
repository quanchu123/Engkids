import { expect, test } from '@playwright/test';

for (const route of ['/admin', '/admin/new', '/admin/edit/test-story']) {
  test(`unauthenticated users are redirected away from ${route}`, async ({ page }) => {
    const response = await page.goto(route);
    expect(response?.status()).toBeLessThan(400);
    await page.waitForURL('**/login');
  });
}
