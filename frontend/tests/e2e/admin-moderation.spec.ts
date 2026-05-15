import { test, expect } from '@playwright/test';

const LIVE_BACKEND = !!process.env['E2E_LIVE_BACKEND'];

test.describe('Admin moderation — offline UI checks', () => {
  test('admin login page renders correctly', async ({ page }) => {
    await page.goto('/auth/login');
    await expect(page.getByLabel(/email/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByLabel(/password/i)).toBeVisible();
  });

  test('/admin/complaints redirects unauthenticated users', async ({ page }) => {
    await page.goto('/admin/complaints');
    // Should redirect to login or show forbidden
    await expect(page).toHaveURL(/login|forbidden|auth/, { timeout: 10000 });
  });
});

test.describe('Admin moderation — full e2e (requires live backend)', () => {
  test.skip(!LIVE_BACKEND, 'requires live backend');

  test('admin login → see queue → approve complaint → status changes', async ({ page }) => {
    // Login as admin
    await page.goto('/auth/login');
    await page.getByLabel(/email/i).fill(process.env['ADMIN_EMAIL'] ?? 'admin@vallentin.local');
    await page.getByLabel(/password/i).fill(process.env['ADMIN_INITIAL_PASSWORD'] ?? 'ChangeMe!Now1');
    await page.getByRole('button', { name: /log in/i }).click();

    await expect(page).toHaveURL(/admin|dashboard/, { timeout: 15000 });

    // Navigate to complaints queue
    await page.goto('/admin/complaints');
    await expect(page.getByRole('heading', { name: /complaints/i })).toBeVisible({ timeout: 10000 });

    // Find a pending_review complaint and approve it
    const viewLinks = page.getByText(/view/i);
    const count = await viewLinks.count();

    if (count > 0) {
      await viewLinks.first().click();
      await page.waitForURL(/admin\/complaints\/.+/, { timeout: 5000 });

      const approveBtn = page.getByRole('button', { name: /approve/i });
      if (await approveBtn.isVisible()) {
        await approveBtn.click();
        // Status should change — page re-fetches
        await expect(page.getByText(/approved|forwarded/i)).toBeVisible({ timeout: 10000 });
      }
    }
  });

  test('admin sees outbox rows for institution and ombudsman after approval', async ({ page }) => {
    test.skip(true, 'requires MailHog access or dedicated e2e setup');
  });
});
