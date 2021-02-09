require('dotenv').config();
const {
  Given, Then, When,
} = require('@cucumber/cucumber');
const assertTrue = require('assert');
const scope = require('../support/scope');

Given('I am on the activity reports page', async () => {
  const page = scope.context.currentPage;
  const selector = 'a[href$="/activity-reports/new"]';
  await Promise.all([
    page.waitForNavigation(),
    page.click(selector),
  ]);
  await scope.context.currentPage.waitForSelector('h1');
});

When('I select {string}', async (inputLabel) => {
  const page = scope.context.currentPage;
  const selector = `//label[text()='${inputLabel}']`;
  const element = await page.$x(selector);
  await element[0].click();
});

Then('I see {string} as an option in the {string} multiselect', async (expectedOption, dropdownLabel) => {
  const page = scope.context.currentPage;
  const selector = `//label[text()='${dropdownLabel}']//div`;
  const multiselect = await page.$x(selector);
  await multiselect[0].click();
  const elements = await page.$x(`//label[text()='${dropdownLabel}']//div//div[2]//div//div`)
  let found = false;

  for (let i = 0; i < elements.length; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    const text = await (await elements[i].getProperty('textContent')).jsonValue();
    if (text.trim() === expectedOption) {
      found = true;
    }
  }

  assertTrue(found === true, `Did not find option "${expectedOption}" in multiselect component labeled "${dropdownLabel}"`);
});
