const { Before, AfterAll } = require('@cucumber/cucumber');
const scope = require('../support/scope');

Before(async () => {
  // You can clean up database models here
});

AfterAll(async () => {
  // If there is a browser window open, then close it
  if (scope.browser) await scope.browser.close();
});
