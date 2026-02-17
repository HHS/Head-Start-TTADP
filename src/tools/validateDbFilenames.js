/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

const FILE_PATTERN = /^(\d{8}|\d{14})-[^/\\]+\.js$/;
const ROOT = path.resolve(__dirname, '../..');
const TARGETS = ['src/migrations', 'src/seeders'];

function getInvalidFiles(dirPath) {
  const fullPath = path.resolve(ROOT, dirPath);
  const entries = fs.readdirSync(fullPath);
  const jsFiles = entries.filter((entry) => entry.endsWith('.js') && !entry.startsWith('.'));
  return jsFiles.filter((file) => !FILE_PATTERN.test(file));
}

function run() {
  const failures = [];

  TARGETS.forEach((target) => {
    const invalidFiles = getInvalidFiles(target);
    if (invalidFiles.length > 0) {
      failures.push({ target, invalidFiles });
    }
  });

  if (failures.length > 0) {
    console.error('Invalid migration/seeder filenames detected.');
    failures.forEach(({ target, invalidFiles }) => {
      console.error(`- ${target}`);
      invalidFiles.forEach((file) => console.error(`  - ${file}`));
    });
    console.error('Expected format: <YYYYMMDD or YYYYMMDDHHMMSS>-<name>.js');
    process.exit(1);
  }

  console.log('Migration and seeder filenames validated successfully.');
}

run();
