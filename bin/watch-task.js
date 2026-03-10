#!/usr/bin/env node

const { main } = require('../src/tools/cfTaskWatcher');

if (require.main === module) {
  main();
}
