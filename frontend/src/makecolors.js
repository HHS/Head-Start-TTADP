/* eslint-disable indent */
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
// or if you are using docker, yarn docker:makecolors from the root directory
// from the frontend directory to generate this file'
// (the colors variables are used in two ways, inlined in javascript and directly in css
// to keep things consistent, we update only in one place - the colors.js file, and use
// yarn makecolors to keep the files identical)

// figma reference here:
// https://www.figma.com/file/5Fr0NKQf9MQ5WGd8BWxA6i/TTA_SmartHub-Library-09132021?node-id=0%3A14

${keys.map((key, index) => {
  const propName = getPropName(key);

  return `$${propName}: ${values[index]};`;
}).join('\n')}`; // end contents string

  fs.writeFile('./src/colors.scss', contents, (err) => {
    if (err) {
      console.log('whoopsie');
      return;
    }

    console.log('colors.scss created');
  }); // end fs call
}// end make colors function

makeColors();
