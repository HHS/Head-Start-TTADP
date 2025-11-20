const path = require('path');
const { summarizeCoverage, logCoverageResults } = require('./summarize-coverage');

const [,, coverageFilePath, requiredCoverageArg] = process.argv;

if (!coverageFilePath || !requiredCoverageArg) {
  // eslint-disable-next-line no-console
  console.error('Error: Please provide both the coverage file path and required coverage percentage.');
  process.exit(1);
}

const requiredCoverage = parseFloat(requiredCoverageArg);

if (isNaN(requiredCoverage)) {
  // eslint-disable-next-line no-console
  console.error('Error: Please provide a valid required coverage percentage as a number.');
  process.exit(1);
}

try {
  const coverage = summarizeCoverage(path.resolve(coverageFilePath), requiredCoverage);
  logCoverageResults(coverage, requiredCoverage);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
