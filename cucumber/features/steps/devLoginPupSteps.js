const {
  Given, When, Then,
} = require('@cucumber/cucumber');
const assertTrue = require('assert');
const assert = require('assert');
const scope = require('../support/scope');

Given('the home page of tta-smarthub', async () => {
  if (!scope.browser) {
    scope.browser = await scope.driver.launch();
  }
  scope.context.currentPage = await scope.browser.newPage();
  await scope.context.currentPage.goto(scope.uri);
  await scope.context.currentPage.waitForSelector('a[href$="api/login"]');
});

Then('we should see "Welcome to the TTA Smart Hub!" message', async () => {
  await scope.context.currentPage.waitForSelector('h1');
  const result = await scope.context.currentPage.$('h1');
  const value = await scope.context.currentPage.evaluate((el) => el.textContent, result);

  assert.equal(value, 'Welcome to the TTA Smart Hub!');
});

When('pressing login', async () => {
  await scope.context.currentPage.click('a[href$="api/login"]');
  await scope.context.currentPage.waitForSelector('.hses');
});

Then('we should see "Head Start Enterprise System" page', async () => {
  const result = await scope.context.currentPage.$('.hses');
  const value = await scope.context.currentPage.evaluate((el) => el.textContent, result);

  assertTrue(value.includes('Head Start Enterprise System'));
});
