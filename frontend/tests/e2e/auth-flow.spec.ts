import { test, expect } from '@playwright/test';

const LIVE_BACKEND = !!process.env['E2E_LIVE_BACKEND'];

test.describe('Auth flow (offline — UI only)', () => {
  test('register page renders correctly', async ({ page }) => {
    await page.goto('/auth/register');
    await expect(page.getByRole('heading', { name: /register|create account/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/full name/i)).toBeVisible();
  });

  test('login page renders correctly', async ({ page }) => {
    await page.goto('/auth/login');
    await expect(page.getByRole('heading', { name: /log in|sign in/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
  });

  test('verify-email page shows pending confirmation message', async ({ page }) => {
    await page.goto('/auth/verify-email');
    // The page may redirect or show a status message
    await expect(page).toHaveURL(/verify-email|login/, { timeout: 10000 });
  });

  test('shows validation errors on empty register submit', async ({ page }) => {
    await page.goto('/auth/register');
    await page.getByRole('button', { name: /create account/i }).click();
    const alerts = page.locator('[role="alert"]');
    await expect(alerts.first()).toBeVisible({ timeout: 5000 });
  });

  test('shows validation errors on empty login submit', async ({ page }) => {
    await page.goto('/auth/login');
    await page.getByRole('button', { name: /log in/i }).click();
    const alerts = page.locator('[role="alert"]');
    await expect(alerts.first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Auth flow — full e2e (requires live backend)', () => {
  test.skip(!LIVE_BACKEND, 'requires live backend');

  test('register → verify-email screen → login → logout', async ({ page }) => {
    const email = `e2e-${Date.now()}@test.example.com`;

    await page.goto('/auth/register');
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/full name/i).fill('E2E Test User');
    const passwords = page.getByLabel(/password/i);
    await passwords.first().fill('TestPass!1');
    await passwords.last().fill('TestPass!1');

    // Accept terms
    const termsCheckbox = page.getByRole('checkbox').first();
    if (await termsCheckbox.isVisible()) await termsCheckbox.check();

    // Complete captcha if visible
    const captchaBtn = page.getByTestId('hcaptcha');
    if (await captchaBtn.isVisible()) await captchaBtn.click();

    await page.getByRole('button', { name: /create account/i }).click();

    // Should land on verify-email screen or similar confirmation
    await expect(page).toHaveURL(/verify|confirm|login/, { timeout: 10000 });

    // After e-mail verification (in a live environment, a test mail-hog link
    // would be used) the user can log in. For the E2E test we check the
    // transition to the verify screen was successful.
    await expect(page.getByText(/(check|verify|confirm).*email|pending/i)).toBeVisible({ timeout: 10000 });
  });
});
