import { test as _test, Page } from '@playwright/test';
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
 * Removes the webpack-dev-server client overlay iframe if present.
 * This overlay can intercept pointer events in tests running against the dev server.
 * @param page {Page}
 */
export async function dismissWebpackOverlay(page: Page) {
  await page.evaluate(() => {
    const overlay = document.getElementById('webpack-dev-server-client-overlay');
    if (overlay) overlay.remove();
  });
}

/**
 *
 * @param page {Page}
 */
export async function blur(page: Page) {
  await page.evaluate(() => {
    const active = document.activeElement as HTMLElement | null;
    if (active && typeof active.blur === 'function') {
      active.blur();
    }

    if (document.body && typeof document.body.focus === 'function') {
      document.body.focus();
    }
  });
}
