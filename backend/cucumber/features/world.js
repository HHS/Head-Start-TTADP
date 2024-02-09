// Dependencies
const { setWorldConstructor, setDefaultTimeout } = require('@cucumber/cucumber');
const puppeteer = require('puppeteer');
const scope = require('./support/scope');
require('dotenv').config();

const World = function () {
  scope.driver = puppeteer;
  scope.context = {};
  scope.uri = process.env.TTA_SMART_HUB_URI;
};

setDefaultTimeout(60 * 1000);
setWorldConstructor(World);
