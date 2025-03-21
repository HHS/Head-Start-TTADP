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
  // find a div with the class 'smart-hub--something-went-wrong'..
  const value = await page.evaluate(() => {
    const element = document.querySelector('.smart-hub--something-went-wrong');
    return element ? element.innerText : '';
  });
  assertTrue(value.includes(heading));
});
