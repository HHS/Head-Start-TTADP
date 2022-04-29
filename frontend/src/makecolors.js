/* eslint-disable no-console */
const fs = require('fs');
const colors = require('./colors');

function getPropName(key) {
  let propName = '';

  for (let x = 0; x < key.length; x += 1) {
    const c = key.charAt(x);

    if (c === c.toUpperCase()) {
      propName += `-${c.toLowerCase()}`;
    } else {
      propName += c;
    }
  }

  return propName;
}

function makeColors() {
  const keys = Object.keys(colors);
  const values = Object.values(colors);

  const contents = `
// STOP! Don't edit this file.
// Instead, edit colors.js and run 'yarn makecolors'
// from the frontend directory to generate this file'

${keys.map((key, index) => {
    const propName = getPropName(key);

    return `$${propName}: ${values[index]};`;
  }).join('\n')}`;

  fs.writeFile('./src/colors.scss', contents, (err) => {
    if (err) {
      console.log('whoopsie');
      return;
    }

    console.log('colors.scss created');
  });
}

makeColors();
