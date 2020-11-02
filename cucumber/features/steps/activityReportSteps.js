require('dotenv').config();
const {
  Given, Then, When,
} = require('@cucumber/cucumber');
const assert = require('assert');
const scope = require('../support/scope');

Given('I am on the activity reports page', async () => {
  const page = scope.context.currentPage;
  const selector = 'a[href$="activity-reports"]';
  await Promise.all([
    page.waitForNavigation(),
    page.click(selector),
  ]);
});

When('I select {string}', async (inputLabel) => {
  const page = scope.context.currentPage;
  const selector = `//label[text()='${inputLabel}']`;
  const element = await page.$x(selector);
  await element[0].click();
});

Then('I see {string} as an option in the {string} dropdown', async (expectedOption, dropdownLabel) => {
  const page = scope.context.currentPage;
  const selector = `//label[text()='${dropdownLabel}']/../select`;
  const el = await page.$x(selector);
  const selected = await el[0].$x(`//option[text()='${expectedOption}']`);

  assert(selected !== null || selected !== undefined);
  assert(selected.length === 1);
});
