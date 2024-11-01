// src/tools/merge-coverage.js

const fs = require('fs');
const path = require('path');
const { createCoverageMap } = require('istanbul-lib-coverage');

const COVERAGE_DIR = path.resolve(__dirname, '../coverage');
const MERGED_COVERAGE_FILE = path.join(COVERAGE_DIR, 'coverage-final.json');

/**
 * Recursively find all coverage-final.json files within the coverage directory.
 * @param {string} dir - Directory to search.
 * @returns {string[]} - Array of file paths.
 */
function findCoverageFiles(dir) {
  const coverageFiles = [];

  function traverse(currentPath) {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });
    entries.forEach((entry) => {
      const fullPath = path.join(currentPath, entry.name);
      if (entry.isDirectory()) {
        traverse(fullPath);
      } else if (entry.isFile() && entry.name === 'coverage-final.json') {
        coverageFiles.push(fullPath);
      }
    });
  }

  traverse(dir);
  return coverageFiles;
}

/**
 * Merge multiple coverage-final.json files into a single coverage map.
 * @param {string[]} coverageFiles - Array of coverage file paths.
 * @returns {Object} - Merged coverage data.
 */
function mergeCoverageFiles(coverageFiles) {
  if (coverageFiles.length === 0) {
    // eslint-disable-next-line no-console
    console.error('No coverage-final.json files found to merge.');
    process.exit(1);
  }

  const mergedCoverageMap = createCoverageMap({});

  coverageFiles.forEach((file) => {
    const coverageData = JSON.parse(fs.readFileSync(file, 'utf8'));
    mergedCoverageMap.merge(coverageData);
  });

  return mergedCoverageMap.toJSON();
}

/**
 * Write the merged coverage data to coverage-final.json.
 * @param {Object} mergedCoverage - Merged coverage data.
 */
function writeMergedCoverage(mergedCoverage) {
  fs.writeFileSync(MERGED_COVERAGE_FILE, JSON.stringify(mergedCoverage), 'utf-8');
  // eslint-disable-next-line no-console
  console.log(`Merged coverage written to ${MERGED_COVERAGE_FILE}`);
}

function main() {
  // eslint-disable-next-line no-console
  console.log('Searching for coverage-final.json files...');
  const coverageFiles = findCoverageFiles(COVERAGE_DIR);
  // eslint-disable-next-line no-console
  console.log('Found coverage files:', coverageFiles);

  // eslint-disable-next-line no-console
  console.log('Merging coverage files...');
  const mergedCoverage = mergeCoverageFiles(coverageFiles);

  // eslint-disable-next-line no-console
  console.log('Writing merged coverage report...');
  writeMergedCoverage(mergedCoverage);

  // eslint-disable-next-line no-console
  console.log('Coverage merging completed successfully.');
}

main();
