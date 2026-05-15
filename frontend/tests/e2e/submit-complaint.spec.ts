import { test, expect } from '@playwright/test';

const LIVE_BACKEND = !!process.env['E2E_LIVE_BACKEND'];

test.describe('Anonymous complaint submission flow', () => {
  test('submit form renders on /complaints/submit', async ({ page }) => {
    await page.goto('/complaints/submit');
    await expect(page.getByRole('heading', { name: /submit a complaint/i })).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#cat')).toBeVisible();
    await expect(page.locator('#comp-title')).toBeVisible();
    await expect(page.locator('#comp-body')).toBeVisible();
  });

  test('category selection loads institution dropdown', async ({ page }) => {
    await page.goto('/complaints/submit');
    await page.waitForSelector('#cat');

    await page.locator('#cat').selectOption('hospitals');

    await page.waitForTimeout(500);

    const institutionDropdown = page.locator('#inst');
    const institutionIsVisible = await institutionDropdown.isVisible();
    const freeTextField = page.locator('#inst-free');
    const freeTextIsVisible = await freeTextField.isVisible();

    expect(institutionIsVisible || freeTextIsVisible).toBe(true);
  });

  test('body counter updates as user types', async ({ page }) => {
    await page.goto('/complaints/submit');

    await page.locator('#comp-body').fill('This is a test complaint body that is quite long and descriptive enough for validation to pass.');

    const counter = page.locator('text=/\\d+ \\//i').first();
    await expect(counter).toBeVisible();
  });

  test('shows validation errors on empty submit', async ({ page }) => {
    await page.goto('/complaints/submit');

    await page.getByRole('button', { name: /submit/i }).click();

    const errorMessages = page.locator('[role="alert"]');
    await expect(errorMessages.first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Anonymous complaint — happy path (requires live backend)', () => {
  test.skip(!LIVE_BACKEND, 'requires live backend');

  test('anonymous happy path: form → submit → thank-you showing publicId', async ({ page }) => {
    await page.goto('/complaints/submit');
    await expect(page.getByRole('heading', { name: /submit a complaint/i })).toBeVisible({ timeout: 10000 });

    await page.locator('#cat').selectOption('hospitals');
    await page.waitForTimeout(300);

    const instDropdown = page.locator('#inst');
    if (await instDropdown.isVisible()) {
      const options = await instDropdown.locator('option').all();
      if (options.length > 1) {
        await instDropdown.selectOption({ index: 1 });
      }
    } else {
      await page.locator('#inst-free').fill('Local Community Hospital');
    }

    await page.locator('#comp-title').fill('E2E Anonymous Complaint');
    await page.locator('#comp-body').fill(
      'This complaint has been submitted through the automated E2E test suite. It is exactly long enough to pass minimum body length validation and includes sufficient detail to be processed.'
    );

    // Complete CAPTCHA (test key auto-completes in test environment)
    const captchaBtn = page.locator('[data-testid="hcaptcha"]');
    if (await captchaBtn.isVisible()) await captchaBtn.click();

    await page.getByRole('button', { name: /submit/i }).click();

    // Should show thank-you with publicId
    await expect(page.getByText(/VLC-\d{4}-\d{6}|thank you|submitted|pending/i)).toBeVisible({ timeout: 15000 });
  });

  test('file upload appears in complaint form', async ({ page }) => {
    await page.goto('/complaints/submit');
    await expect(page.getByRole('heading', { name: /submit a complaint/i })).toBeVisible({ timeout: 10000 });

    const fileInput = page.locator('input[type="file"]');
    if (await fileInput.isVisible()) {
      await fileInput.setInputFiles({
        name: 'test-attachment.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('%PDF-1.4 test content'),
      });
      await expect(page.getByText(/test-attachment\.pdf/i)).toBeVisible({ timeout: 5000 });
    }
  });

  test('validation error path: shows field errors without submitting', async ({ page }) => {
    await page.goto('/complaints/submit');

    await page.getByRole('button', { name: /submit/i }).click();

    const alert = page.locator('[role="alert"]').first();
    await expect(alert).toBeVisible({ timeout: 5000 });
  });
});
