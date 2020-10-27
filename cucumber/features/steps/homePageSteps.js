require('dotenv').config();
const {
  Given, Then,
} = require('@cucumber/cucumber');
const assertTrue = require('assert');
const assert = require('assert');
const scope = require('../support/scope');

Given('I am logged in', async () => {
  if (!scope.browser) {
    const width = 1024;
    const height = 1600;

    scope.browser = await scope.driver.launch({
      defaultViewport: { width, height },
      headless: true,
      // slowMo: 250, // can be used in conjunction with headless: false to slow down the browser
    });
  }
  scope.context.currentPage = await scope.browser.newPage();
  const page = scope.context.currentPage;

  const domain = process.env.TTA_SMART_HUB_URI.split('//')[1];

  const cookies = [{
    name: 'CUCUMBER_USER',
    value: `${process.env.CUCUMBER_USER}`,
    domain,
    path: '/',
    httpOnly: true,
    secure: false,
    session: true,
    sameSite: 'Strict',
  }];

  await page.setCookie(...cookies);

  const loginLinkSelector = 'a[href$="api/login"]';
  // const homeLinkSelector = 'a[href$="/"]';
  const activityReportsSelector = 'a[href$="activity-reports"]';

  await page.goto(scope.uri);
  await page.waitForSelector('em'); // Page title
  const name = await page.$eval('em', (el) => el.innerText);

  assert.equal(name, 'TTA Smart Hub');
  // Check if actually logged in. If not login
  const result = await page.$(loginLinkSelector);

  if (result) {
    await page.click(loginLinkSelector);
    await page.waitForSelector(activityReportsSelector); // Activity Reports link
    await page.screenshot({ path: 'reports/givenLoggedIn.png' });
  }
});

Given('I am on the Smart Hub home page', async () => {
  await scope.context.currentPage.waitForSelector('h1');
});

Then('I see {string} message', async (string) => {
  const page = scope.context.currentPage;
  const value = await page.$eval('h1', (el) => el.textContent);

  assertTrue(value.includes(string));
});

Then('I see {string} link', async (string) => {
  const page = scope.context.currentPage;
  const selector = 'a[href$="activity-reports"]';

  await page.waitForSelector(selector);
  const value = await page.$eval(selector, (el) => el.textContent);

  assert.equal(value, string);
});
