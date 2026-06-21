import { expect, test } from '@playwright/test';

test('login screen renders sign-in and sign-up modes', async ({ page }) => {
  await page.goto('/login');

  await expect(page.getByTestId('login-form')).toBeVisible();
  await expect(page.getByTestId('login-email')).toBeVisible();
  await expect(page.getByTestId('login-password')).toBeVisible();
  await expect(page.getByTestId('login-submit')).toBeVisible();

  await page.getByTestId('login-mode-toggle').click();
  await expect(page.getByTestId('signup-name')).toBeVisible();
});
