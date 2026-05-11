#!/usr/bin/env node

const esmRequire = require('esm')(module /*, options*/);
esmRequire('../index.js').exportLastMainTests();
