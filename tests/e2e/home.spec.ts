import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  // Keep the homepage smoke tests independent of seeded users and live services.
  await page.route('**/api/**', async (route) => {
    const { pathname } = new URL(route.request().url());
    if (pathname === '/api/user') {
      await route.fulfill({
        json: {
          id: 1,
          name: 'Annika Lewis',
          homeRegionId: 1,
          flags: ['actionable_notifications'],
          roles: [],
          permissions: [],
        },
      });
    } else if (pathname === '/api/feeds/whats-new') {
      await route.fulfill({ body: '', contentType: 'text/plain' });
    } else {
      await route.fulfill({ json: pathname === '/api/alerts' ? null : [] });
    }
  });
});

test('navigate from Home to updates and back through the shared navigation', async ({ page }) => {
  await page.goto('/');
  const home = page
    .getByRole('navigation', { name: 'main navigation' })
    .getByRole('link', { name: 'Home', exact: true });
  await expect(home).toHaveAttribute('aria-current', 'page');
  await page.getByRole('link', { name: 'View updates', exact: true }).click();
  await expect(page).toHaveURL(/\/whats-new$/);
  await expect(page.getByRole('heading', { name: "What's New", exact: true })).toBeVisible();
  await expect(home).not.toHaveAttribute('aria-current', 'page');
  await home.click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Welcome to the TTA Hub, Annika Lewis'
  );
});

test('cards have equal desktop columns and reflow without clipping', async ({ page }) => {
  await page.goto('/');
  const cards = page.locator('#main-content .ttahub-widget-card');
  await expect(cards).toHaveCount(5);
  for (const width of [1440, 1024, 1023, 375, 320]) {
    await page.setViewportSize({ width, height: 1100 });
    const boxes = await cards.evaluateAll((elements) =>
      elements.map((element) => {
        const { x, y, width: cardWidth, right } = element.getBoundingClientRect();
        const icon = element.querySelector('[aria-hidden="true"]').getBoundingClientRect();
        const heading = element.querySelector('h2').getBoundingClientRect();
        return {
          x,
          y,
          width: cardWidth,
          right,
          scrollWidth: element.scrollWidth,
          clientWidth: element.clientWidth,
          iconRight: icon.right,
          iconBottom: icon.bottom,
          headingX: heading.x,
          headingY: heading.y,
        };
      })
    );
    if (width >= 1024) {
      expect(Math.abs(boxes[0].width - boxes[1].width)).toBeLessThan(1);
      expect(boxes[0].y).toBe(boxes[1].y);
      expect(boxes[1].x).toBeGreaterThan(boxes[0].x);
    } else {
      expect(boxes[0].x).toBe(boxes[1].x);
      expect(boxes[1].y).toBeGreaterThan(boxes[0].y);
    }
    for (const box of boxes) {
      expect(box.right).toBeLessThanOrEqual(width);
      expect(box.scrollWidth).toBeLessThanOrEqual(box.clientWidth + 1);
      if (width >= 640) expect(box.iconRight).toBeLessThan(box.headingX);
      else expect(box.iconBottom).toBeLessThan(box.headingY);
    }
  }
});

test('homepage accessibility scan and keyboard link order', async ({ page }) => {
  await page.goto('/');
  const main = page.getByRole('main');
  await expect(main.getByRole('heading', { level: 2 })).toHaveCount(5);
  const results = await new AxeBuilder({ page }).include('#main-content').analyze();
  expect(results.violations).toEqual([]);
  const labels = [
    'Manage account',
    'View notifications',
    'View updates',
    'View user guide',
    'Contact support',
  ];
  await main.getByRole('link', { name: labels[0], exact: true }).focus();
  for (const [index, label] of labels.entries()) {
    if (index) await page.keyboard.press('Tab');
    await expect(main.getByRole('link', { name: label, exact: true })).toBeFocused();
  }
});

for (const [label, destination] of [
  ['View user guide', 'https://acf-ohs.atlassian.net/wiki/spaces/OHSTTA/'],
  ['Contact support', 'https://app.smartsheetgov.com/b/form/f0b4725683f04f349a939bd2e3f5425a'],
]) {
  test(`${label} navigates in the current tab`, async ({ page, context }) => {
    await page.route(destination, (route) =>
      route.fulfill({ body: 'External destination stub', contentType: 'text/html' })
    );
    await page.goto('/');
    await page.getByRole('main').getByRole('link', { name: label, exact: true }).click();
    await expect(page).toHaveURL(destination);
    expect(context.pages()).toHaveLength(1);
  });
}
