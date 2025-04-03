#!/usr/bin/env node

/* eslint-disable no-continue */
/* eslint-disable no-console */

const fs = require('fs');
const events = require('events');
const readline = require('readline');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

/* read in a yaml file, parse it, and write it to a file in env format */

function parseArgs() {
  return yargs(hideBin(process.argv))
    .option('in_file', {
      alias: 'i',
      describe: 'yaml file to parse',
      type: 'string',
      demandOption: true,
    })
    .option('out_file', {
      alias: 'o',
      describe: 'env file to write',
      type: 'string',
      demandOption: true,
    })
    .check((argv) => {
      if (!fs.existsSync(argv.in_file)) {
        throw new Error(`File does not exist: ${argv.env_file}`);
      }
      return true;
    })
    .argv;
}

async function processLineByLine(in_file, out_file) {
  console.log(`Parsing yaml file: ${in_file}`);
  console.log(`Writing env file: ${out_file}`);
  const inStream = fs.createReadStream(in_file);
  const rl = readline.createInterface({
    input: inStream,
    crlfDelay: Infinity,
  });
  const outStream = fs.createWriteStream(out_file);
  let i = 0;
  /* eslint-disable-next-line no-restricted-syntax */
  for await (const rawLine of rl) {
    const line = rawLine.trim().split('#')[0];
    if (line.startsWith('#')) {
      continue; // skip comments
    }
    if (line.length === 0) {
      continue; // skip empty lines
    }
    const [key, value] = line.split(':');
    if (key && value) {
      i += 1;
      outStream.write(`${key.trim()}=${value.trim()}\n`);
    }
  }
  outStream.end();
  console.log(`Wrote ${i} lines`);
}

async function main() {
  const argv = parseArgs();
  processLineByLine(argv.in_file, argv.out_file);
}

if (require.main === module) {
  main();
}
