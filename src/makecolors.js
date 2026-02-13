/* eslint-disable indent */
/* eslint-disable no-console */
const fs = require('node:fs')
const { promises: fsPromises } = require('node:fs')
const crypto = require('node:crypto')
const colors = require('../frontend/src/colors')

async function generateHashes() {
  try {
    const scssFileBuffer = await fsPromises.readFile('./frontend/src/colors.scss')
    const scsshash = crypto.createHash('sha256')
    scsshash.update(scssFileBuffer)

    const scsshex = scsshash.digest('hex')
    await fsPromises.writeFile('./frontend/colorsscsschecksum', scsshex)
    console.log('colors.scss hash created')

    const jsFileBuffer = await fsPromises.readFile('./frontend/src/colors.js')
    const jsHash = crypto.createHash('sha256')
    jsHash.update(jsFileBuffer)

    const jshex = jsHash.digest('hex')
    await fsPromises.writeFile('./frontend/colorsjschecksum', jshex)
    console.log('colors.js hash created')
  } catch (err) {
    console.error('Error generating hashes:', err)
    throw err
  }
}

function getPropName(key) {
  let propName = ''

  for (let x = 0; x < key.length; x += 1) {
    const c = key.charAt(x)

    if (c === c.toUpperCase()) {
      propName += `-${c.toLowerCase()}`
    } else {
      propName += c
    }
  }

  return propName
}

async function makeColors() {
  try {
    const entries = Object.entries(colors)

    const propNames = entries.map(([key]) => getPropName(key))
    const values = entries.map(([, value]) => value)

    const contents = `
// STOP! Don't edit this file.
// Instead, edit colors.js and run 'yarn makecolors'
// or if you are using docker, yarn docker:makecolors
// to generate this file (the colors variables are used in two ways, inlined in javascript and directly in css
// to keep things consistent, we update only in one place - the colors.js file, and use
// yarn makecolors to keep the files identical)

// figma reference here:
// https://www.figma.com/file/5Fr0NKQf9MQ5WGd8BWxA6i/TTA_SmartHub-Library-09132021?node-id=0%3A14

// scss vars
${propNames.map((name, index) => `$${name}: ${values[index]};`).join('\n')}

// css custom properties
:root {
${propNames.map((name, index) => `  --${name}: ${values[index]};`).join('\n')}
}

`

    await fsPromises.writeFile('./frontend/src/colors.scss', contents)
    console.log('colors.scss created')

    await generateHashes()
  } catch (err) {
    console.error('Error generating colors:', err)
    process.exit(1)
  }
}

makeColors()
