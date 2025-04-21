#!/usr/bin/env node

/* eslint-disable no-continue */
/* eslint-disable no-console */

/* accepts 2 args: a yaml filepath and an output filepath
  * parses the yaml file and writes the env-format file
  * usage: parse-env <in_file> <out_file>
  * example: parse-env ./config.yaml ./config.env
  */

const fs = require('fs');
const readline = require('readline');
const { parseArgs } = require('node:util');

function parse() {
  const args = process.argv.slice(2);
  const parsedArgs = parseArgs({
    args,
    allowPositionals: true,
  });
  if (parsedArgs.positionals.length !== 2) {
    console.error(`Got ${parsedArgs.positionals}`);
    console.error('Usage: parse-env <in_file> <out_file>');
    process.exit(1);
  }
  return parsedArgs.positionals;
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
    // everything before the first colon
    const key = line.split(':')[0];
    // everything after
    const value = line.split(':').slice(1).join(':');
    if (key && value) {
      i += 1;
      outStream.write(`${key.trim()}=${value.trim()}\n`);
    }
  }
  outStream.end();
  console.log(`Wrote ${i} lines`);
}

async function main() {
  const argv = parse();
  processLineByLine(argv[0], argv[1]);
}

if (require.main === module) {
  main();
}
