/* eslint-disable no-console */
const fs = require('fs');

function summarizeCoverage(coverageFilePath, requiredCoverage) {
  let coverageData;

  try {
    coverageData = JSON.parse(fs.readFileSync(coverageFilePath, 'utf-8'));
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error(`Coverage file not found at ${coverageFilePath}`);
    } else if (error instanceof SyntaxError) {
      throw new Error('Failed to parse coverage data. Ensure the file contains valid JSON.');
    } else {
      throw new Error('Unexpected error while reading the coverage file.');
    }
  }

  let totalStatementsCovered = 0;
  let totalStatements = 0;
  let totalFunctionsCovered = 0;
  let totalFunctions = 0;
  let totalBranchesCovered = 0;
  let totalBranches = 0;

  // eslint-disable-next-line no-restricted-syntax, guard-for-in
  for (const file in coverageData) {
    const fileData = coverageData[file];

    // Statements
    totalStatementsCovered += Object.values(fileData.s).filter((count) => count > 0).length * 1.0;
    totalStatements += Object.keys(fileData.s).length;

    // Functions
    totalFunctionsCovered += Object.values(fileData.f).filter((count) => count > 0).length * 1.0;
    totalFunctions += Object.keys(fileData.f).length;

    // Branches
    totalBranchesCovered += Object.values(fileData.b)
      .map((branch) => branch.filter((count) => count > 0).length)
      .reduce((acc, covered) => acc + covered, 0) * 1.0;
    totalBranches += Object.values(fileData.b)
      .map((branch) => branch.length)
      .reduce((acc, total) => acc + total, 0);
  }

  const overallCoverage = ((totalStatementsCovered + totalFunctionsCovered + totalBranchesCovered)
    / (totalStatements + totalFunctions + totalBranches)) * 100;

  return {
    statements: (totalStatementsCovered / totalStatements) * 100,
    functions: (totalFunctionsCovered / totalFunctions) * 100,
    branches: (totalBranchesCovered / totalBranches) * 100,
    overall: overallCoverage,
  };
}

function logCoverageResults(coverage, requiredCoverage) {
  console.log('Coverage Summary:');
  console.log(`Statements: ${coverage.statements.toFixed(2)}%`);
  console.log(`Functions: ${coverage.functions.toFixed(2)}%`);
  console.log(`Branches: ${coverage.branches.toFixed(2)}%`);
  console.log(`Overall Coverage: ${coverage.overall.toFixed(2)}%`);

  if (coverage.overall < requiredCoverage) {
    console.error(`Error: Coverage (${coverage.overall.toFixed(2)}%) is below the required ${requiredCoverage}%`);
    process.exit(1);
  } else {
    console.log(`Success: Coverage (${coverage.overall.toFixed(2)}%) meets the required ${requiredCoverage}%`);
  }
}

module.exports = { summarizeCoverage, logCoverageResults };
