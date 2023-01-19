import { test as _test } from '@playwright/test';
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

export async function blur(page) {
  await page.getByText('Office of Head Start TTA Hub').click();
}
