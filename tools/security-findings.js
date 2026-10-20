#!/usr/bin/env node

const api = require('./security-findings/index');
const { main } = require('./security-findings/cli');

if (require.main === module) {
  main();
}

module.exports = api;
