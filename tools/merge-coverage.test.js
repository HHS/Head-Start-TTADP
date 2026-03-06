/* eslint-disable no-console */
/* eslint-disable import/no-extraneous-dependencies */
// src/tools/merge-coverage.js

const fs = require('fs');
const path = require('path');
const { createCoverageMap } = require('istanbul-lib-coverage');

const DEFAULT_COVERAGE_DIR = path.resolve(__dirname, '../coverage');
const DEFAULT_MERGED_COVERAGE_FILE = path.join(DEFAULT_COVERAGE_DIR, 'coverage-final.json');

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
    const errorMessage = 'No coverage-final.json files found to merge.';
    console.error(errorMessage);
    throw new Error(errorMessage);
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
 * @param {string} outputFile - The output file path.
 */
function writeMergedCoverage(mergedCoverage, outputFile) {
  fs.writeFileSync(outputFile, JSON.stringify(mergedCoverage), 'utf-8');
  console.log(`Merged coverage written to ${outputFile}`);
}

/**
 * Main function to execute the coverage merging process.
 * @param {string} coverageDir - Directory to search for coverage files.
 * @param {string} mergedCoverageFile - Output file path for the merged coverage.
 */
function main(
  coverageDir = DEFAULT_COVERAGE_DIR,
  mergedCoverageFile = DEFAULT_MERGED_COVERAGE_FILE,
) {
  try {
    console.log('Searching for coverage-final.json files...');
    const coverageFiles = findCoverageFiles(coverageDir);
    console.log('Found coverage files:', coverageFiles);

    console.log('Merging coverage files...');
    const mergedCoverage = mergeCoverageFiles(coverageFiles);

    console.log('Writing merged coverage report...');
    writeMergedCoverage(mergedCoverage, mergedCoverageFile);

    console.log('Coverage merging completed successfully.');
  } catch (error) {
    console.error('Error during coverage merging:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  findCoverageFiles,
  mergeCoverageFiles,
  writeMergedCoverage,
  main,
  DEFAULT_COVERAGE_DIR,
  DEFAULT_MERGED_COVERAGE_FILE,
};
