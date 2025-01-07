const fs = require('fs');
const path = require('path');

function calculateCoverage(coverageFilePath, requiredCoverage) {
  let coverageData;

  try {
    coverageData = JSON.parse(fs.readFileSync(coverageFilePath, 'utf-8'));
  } catch (error) {
    if (error.code === 'ENOENT') {
      // eslint-disable-next-line no-console
      console.error(`Error: Coverage file not found at ${coverageFilePath}`);
    } else if (error instanceof SyntaxError) {
      // eslint-disable-next-line no-console
      console.error('Error: Failed to parse coverage data. Ensure the file contains valid JSON.');
    } else {
      // eslint-disable-next-line no-console
      console.error('Error: Unexpected error while reading the coverage file.');
    }
    process.exit(1);
  }

  let totalStatementsCovered = 0;
  let totalStatements = 0;
  let totalFunctionsCovered = 0;
  let totalFunctions = 0;
  let totalBranchesCovered = 0;
  let totalBranches = 0;

  for (const file in coverageData) {
    const fileData = coverageData[file];

    // Statements
    totalStatementsCovered += Object.values(fileData.s).filter((count) => count > 0).length;
    totalStatements += Object.keys(fileData.s).length;

    // Functions
    totalFunctionsCovered += Object.values(fileData.f).filter((count) => count > 0).length;
    totalFunctions += Object.keys(fileData.f).length;

    // Branches
    totalBranchesCovered += Object.values(fileData.b)
      .map((branch) => branch.filter((count) => count > 0).length)
      .reduce((acc, covered) => acc + covered, 0);
    totalBranches += Object.values(fileData.b)
      .map((branch) => branch.length)
      .reduce((acc, total) => acc + total, 0);
  }

  const overallCoverage = ((totalStatementsCovered + totalFunctionsCovered + totalBranchesCovered) /
    (totalStatements + totalFunctions + totalBranches)) * 100;

  // eslint-disable-next-line no-console
  console.log('Coverage Summary:');
  // eslint-disable-next-line no-console
  console.log(`Statements: ${((totalStatementsCovered / totalStatements) * 100).toFixed(2)}%`);
  // eslint-disable-next-line no-console
  console.log(`Functions: ${((totalFunctionsCovered / totalFunctions) * 100).toFixed(2)}%`);
  // eslint-disable-next-line no-console
  console.log(`Branches: ${((totalBranchesCovered / totalBranches) * 100).toFixed(2)}%`);
  // eslint-disable-next-line no-console
  console.log(`Overall Coverage: ${overallCoverage.toFixed(2)}%`);

  if (overallCoverage < requiredCoverage) {
    // eslint-disable-next-line no-console
    console.error(`Error: Coverage (${overallCoverage.toFixed(2)}%) is below the required ${requiredCoverage}%`);
    process.exit(1); // Exit with a non-zero status
  } else {
    // eslint-disable-next-line no-console
    console.log(`Success: Coverage (${overallCoverage.toFixed(2)}%) meets the required ${requiredCoverage}%`);
  }
}

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

calculateCoverage(path.resolve(coverageFilePath), requiredCoverage);
