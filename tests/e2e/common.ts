import { test as _test, expect, Page } from '@playwright/test';
import path from "path";

/**
 * Install Sinon in all the pages in the context.
 * 
 * @example
 * import { useClock } from './common';

 * useClock(test);
 * 
 * test('some test', async ({ page }) => {
 *   // advance all timers by 2m
 *   await page.evaluate(() => (window as any).__clock.tick(120_000));
 * });
 * @param test typeof `import { test } from '@playwright/test'`
 */
export const useClock = (test: typeof _test) => {
  test.beforeEach(async ({ context }) => {
    await context.addInitScript({
      path: path.join(__dirname, '..', './node_modules/sinon/pkg/sinon.js'),
    });
    await context.addInitScript(() => {
      (window as any).__clock = (window as any).sinon.useFakeTimers();
    });
  });
}

/**
 * 
 * @param page {Page}
 */
export async function blur(page: Page) {
  await page.getByText('Office of Head Start TTA Hub').click();
}

/**
 * Navigate to the app root and ensure we have an authenticated session.
 * If the unauthenticated landing page is shown, click "Log In with HSES"
 * and wait for the authenticated home heading.
 */
export async function ensureLoggedIn(page: Page) {
  await page.goto('/');

  const authenticatedWelcome = page.getByRole('heading', { name: /welcome to the tta hub,/i });
  const unauthenticatedWelcome = page.getByRole('heading', { name: /^welcome to the tta hub$/i });
  const loginLink = page.getByRole('link', { name: /log in with hses/i });

  const hasAuthenticatedWelcome = await authenticatedWelcome.isVisible({ timeout: 5000 })
    .catch(() => false);

  if (hasAuthenticatedWelcome) {
    return;
  }

  const hasUnauthenticatedWelcome = await unauthenticatedWelcome.isVisible({ timeout: 5000 })
    .catch(() => false);

  if (hasUnauthenticatedWelcome) {
    await loginLink.click();
  }

  await expect(authenticatedWelcome).toBeVisible({ timeout: 60_000 });
}

export async function getFullName(page: Page) {
  await ensureLoggedIn(page);
  const welcomeText = page.getByRole('heading', { name: /welcome to the tta hub,/i });
  const text = await welcomeText.textContent();
  return text ? text.replace(/welcome to the tta hub, /i, '') : '';
}
