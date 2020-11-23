require('dotenv').config();
const { Given, Then } = require('@cucumber/cucumber');
const join = require('url-join');
const assertTrue = require('assert');
const scope = require('../support/scope');

Given('I go to an unknown page', async () => {
  const page = scope.context.currentPage;
  await page.goto(join(scope.uri, 'unknown'));
  await page.screenshot({ path: 'reports/unknown.png' });
});

Then('I see the {string} alert message', async (heading) => {
  const page = scope.context.currentPage;
  const value = await page.$eval('.usa-alert__heading', (el) => el.textContent);

  assertTrue(value.includes(heading));
});
