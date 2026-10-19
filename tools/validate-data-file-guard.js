const { execFileSync } = require('node:child_process');
const { evaluate } = require('./data-file-guard');

const baseRef = process.env.BASE_REF;

if (!baseRef) {
  console.error('BASE_REF is required (for example origin/main).');
  process.exit(1);
}

const git = (...args) =>
  execFileSync('git', args, { encoding: 'utf8', maxBuffer: 512 * 1024 * 1024 });

const range = `${baseRef}...HEAD`;
const result = evaluate({
  nameStatusOutput: git('diff', '--name-status', '--no-renames', range),
  diffText: git('diff', '--unified=0', '--no-renames', range, '--', '*.xml', '*.csv', '*.tsv'),
});

if (!result.valid) {
  console.error(result.message);
  process.exit(1);
}

console.log(result.message);
