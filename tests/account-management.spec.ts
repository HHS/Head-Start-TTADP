import { test, expect } from '@playwright/test';

test.describe('Account Management', () => {
  /**
   * There are apparently known problems with trying to send emails from containers in CircleCI.
   * See: https://support.circleci.com/hc/en-us/articles/360007444314-Troubleshooting-sending-email-s-from-a-container
   * I think this test still provides value, so we just skip it if we're running in CI.
   */
  if (process.env.CI) return;

  test('can verify email address', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('header-avatar').click();
    await page.getByRole('link', { name: 'Account Management' }).click();

    await page.getByTestId('send-verification-email-button').click();
    await page.keyboard.press('Enter');
    await page.getByText('Verification email sent');

    const page1 = await page.context().newPage();
    await page1.goto('http://localhost:1080/');
    await page1.locator('#messages > table > tbody > tr:nth-child(1)').click();
    await page1.waitForTimeout(1_000);

    const [page2] = await Promise.all([
      page1.waitForEvent('popup'),
      page1.frameLocator('iframe').getByRole('link', { name: /http:\/\/localhost:3000\/account\/verify*/ }).click()
    ]);

    expect(await page2.getByText('Your email has been verified!')).toBeTruthy();
  });
});
