/* eslint-disable import/no-extraneous-dependencies */
require('dotenv').config();
const {
  Given, Then, When,
} = require('@cucumber/cucumber');
const assertTrue = require('assert');
const scope = require('../support/scope');

Given('I am on the landing page', async () => {
  const page = scope.context.currentPage;
  const selector = 'a[href$="activity-reports"]';
  await Promise.all([
    page.waitForNavigation(),
    page.click(selector),
  ]);

  await scope.context.currentPage.waitForSelector('h1');

  await Promise.all([
    page.waitForNavigation(),
    await page.goto(`${scope.uri}/activity-reports/new`),
  ]);
  await scope.context.currentPage.waitForSelector('#main-content > div.smart-hub-activity-report > div.grid-row.flex-justify > div.grid-col-auto.flex-align-self-center > div');
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
  const elements = await page.$x(`//label[text()='${dropdownLabel}']//div//div[2]//div//div`);
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
