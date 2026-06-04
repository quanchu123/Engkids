import { expect, test } from '@playwright/test';

const adminEmail = process.env.E2E_ADMIN_EMAIL;
const adminPassword = process.env.E2E_ADMIN_PASSWORD;

test.describe('admin story CRUD', () => {
  test.skip(!adminEmail || !adminPassword, 'E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD are required');

  test('admin can create and delete a story', async ({ page }) => {
    const uniqueTitle = `Playwright Story ${Date.now()}`;

    await page.goto('/login');
    await page.getByTestId('login-email').fill(adminEmail!);
    await page.getByTestId('login-password').fill(adminPassword!);
    await page.getByTestId('login-submit').click();

    await page.waitForURL(/\/admin|\/progress/);
    await page.goto('/admin/new');

    await page.getByTestId('story-title-en').fill(uniqueTitle);
    await page.getByTestId('story-title-vi').fill(`Truyện ${uniqueTitle}`);
    await page.getByPlaceholder('Dán URL ảnh (https://...)').fill('data:image/gif;base64,R0lGODlhAQABAAAAACw=');
    await page.getByPlaceholder('The cat is sleeping on the bed.').fill('The little cat is sleeping.');
    await page.getByPlaceholder('Con mèo đang ngủ trên giường.').fill('Chú mèo nhỏ đang ngủ.');
    await page.getByTestId('save-story').click();

    await page.waitForURL('**/admin');
    await page.getByTestId('admin-story-search').fill(uniqueTitle);

    const row = page.locator('tr', { hasText: uniqueTitle });
    await expect(row).toBeVisible();

    page.once('dialog', (dialog) => dialog.accept());
    await row.getByTitle('Xóa').click();

    await expect(row).toHaveCount(0);
  });
});
