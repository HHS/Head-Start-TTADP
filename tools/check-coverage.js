// src/tools/check-coverage.js

const fs = require('fs');
const path = require('path');
const simpleGit = require('simple-git');
const { createCoverageMap } = require('istanbul-lib-coverage');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

// Configuration
const argv = yargs(hideBin(process.argv))
  .option('coverage-file', {
    alias: 'c',
    type: 'string',
    description: 'Specify location of coverage file',
    default: '../coverage/coverage-final.json',
  })
  .option('artifact-dir', {
    alias: 'a',
    type: 'string',
    description: 'Specify location of artifact dir',
    default: '../coverage-artifacts',
  })
  .option('github-subdir', {
    alias: 'g',
    type: 'string',
    description: 'Specify GitHub subdir',
    default: '',
  })
  .option('fail-on-uncovered', {
    alias: 'f',
    type: 'boolean',
    description: 'Fail the script if uncovered lines are detected',
    default: true,
  })
  .option('output-format', {
    alias: 'o',
    type: 'string',
    description: 'Specify output formats (comma-separated, e.g., json,html)',
    default: 'json',
  })
  .help()
  .alias('help', 'h').argv;

const COVERAGE_FILE = path.resolve(__dirname, argv['coverage-file']);
const BASE_BRANCH = 'main';
// Directory to store artifacts
const ARTIFACT_DIR = path.resolve(__dirname, argv['artifact-dir']);

/**
 * Fetch the base branch to ensure it's up-to-date.
 */
async function fetchBaseBranch() {
  const git = simpleGit();
  await git.fetch('origin', BASE_BRANCH);
}

/**
 * Get the merge base between current HEAD and the base branch.
 */
async function getMergeBase() {
  const git = simpleGit();
  const mergeBase = await git.raw(['merge-base', 'HEAD', BASE_BRANCH]);
  return mergeBase.trim();
}

/**
 * Get the list of modified or added lines in the PR, optionally filtered by directory.
 * @param {string} mergeBase - The base commit to compare against.
 * @param {string} [directory] - The directory to filter files by (optional).
 */
async function getModifiedLines(mergeBase, directory) {
  const git = simpleGit();
  const diffFiles = await git.diff(['--name-only', `${BASE_BRANCH}...HEAD`]);
  // eslint-disable-next-line no-console
  console.log('getModifiedLines:', diffFiles);

  // Filter files based on the file extension and optional directory
  let files = diffFiles
    .split('\n')
    .filter((file) => /\.(js|ts)$/.test(file))
    .filter((file) => !file.includes('/__tests__/'))
    .filter((file) => !file.includes('.test.'));

  // If a directory is provided, filter files that start with the directory
  if (directory && directory.length !== 0) {
    files = files.filter((file) => file.includes(`${directory}/`));
  } else {
    // Directories that are tested in non-defualt path
    files = files
      .filter((file) => !file.includes('packages/common/'))
      .filter((file) => !file.includes('similarity_api/'))
      .filter((file) => file.includes(`frontend/`));
  }
  // eslint-disable-next-line no-console
  console.log('files:', files);

  const modifiedLines = {};

  for (const file of files) {
    // Log the file being processed
    // eslint-disable-next-line no-console
    console.log('getModifiedLines:', file);
    const diff = await git.diff(['-U0', `${mergeBase}..HEAD`, '--', file]);
    const regex = /@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/g;
    let match;

    while ((match = regex.exec(diff)) !== null) {
      const startLine = parseInt(match[1], 10);
      const lineCount = match[2] ? parseInt(match[2], 10) : 1;

      if (!modifiedLines[file]) {
        modifiedLines[file] = new Set();
      }
      for (let i = startLine; i < startLine + lineCount; i++) {
        // eslint-disable-next-line no-console
        console.log(i);
        modifiedLines[file].add(i);
      }
    }
  }

  // Convert sets to arrays
  Object.keys(modifiedLines).forEach((file) => {
    modifiedLines[file] = Array.from(modifiedLines[file]);
  });

  return modifiedLines;
}

/**
 * Load and parse the merged coverage report.
 */
function loadCoverage(coverageFile = COVERAGE_FILE) {
  if (!fs.existsSync(coverageFile)) {
    const errorMessage = `Coverage file not found at ${coverageFile}`;
    // eslint-disable-next-line no-console
    console.error(errorMessage);
    throw new Error(errorMessage);
  }

  const coverageData = JSON.parse(fs.readFileSync(coverageFile, 'utf8'));
  const coverageMap = createCoverageMap(coverageData);
  return coverageMap;
}

// Helper function to get an array of lines from a location
function getLinesFromLocation(loc) {
  const lines = [];
  for (let i = loc.start.line; i <= loc.end.line; i++) {
    lines.push(i);
  }
  return lines;
}

// Helper function to get overlapping lines between two arrays
function linesIntersect(lines1, lines2) {
  return lines1.filter((line) => lines2.includes(line));
}

// Helper function to adjust location to only include overlapping lines
function intersectLocationWithLines(loc, overlappingLines) {
  if (overlappingLines.length === 0) {
    return null; // No overlap
  }
  const newStartLine = Math.max(loc.start.line, Math.min(...overlappingLines));
  const newEndLine = Math.min(loc.end.line, Math.max(...overlappingLines));

  const newStart = { ...loc.start };
  const newEnd = { ...loc.end };

  // Adjust start line and column
  if (newStartLine !== loc.start.line) {
    newStart.line = newStartLine;
    newStart.column = 0; // Reset column since line changed
  }

  // Adjust end line and column
  if (newEndLine !== loc.end.line) {
    newEnd.line = newEndLine;
    newEnd.column = undefined; // Column is unknown
  }

  return { start: newStart, end: newEnd };
}

/**
 * Check if modified lines are covered.
 */
function checkCoverage(modifiedLines, coverageMap) {
  const uncovered = {};

  Object.entries(modifiedLines).forEach(([file, lines]) => {
    // Normalize file path to match coverage map keys
    const normalizedFile = path.resolve(process.cwd(), file);
    const relativeFile = path.relative(process.cwd(), normalizedFile);

    let fileCoverage;
    try {
      fileCoverage = coverageMap.fileCoverageFor(normalizedFile);
      if (!fileCoverage) {
        throw new Error(`File not found in coverage map: ${normalizedFile}`);
      }
    } catch (e) {
      // If the file is not in the coverage report, consider all lines uncovered
      // eslint-disable-next-line no-console
      console.log('checkCoverage:', file, lines, e);
      const ranges = groupIntoRanges(lines);
      if (!uncovered[relativeFile]) {
        uncovered[relativeFile] = {
          statements: [],
          functions: [],
          branches: [],
        };
      }
      ranges.forEach(({ start, end }) => {
        uncovered[relativeFile].statements.push({
          start: {
            line: start,
            column: 0,
          },
          end: {
            line: end,
            column: 0,
          },
        });
      });
      return;
    }

    if (!uncovered[relativeFile]) {
      uncovered[relativeFile] = {
        statements: [],
        functions: [],
        branches: [],
      };
    }

    // Check uncovered statements
    Object.entries(fileCoverage.statementMap).forEach(([id, loc]) => {
      const statementLines = getLinesFromLocation(loc);
      const overlappingLines = linesIntersect(lines, statementLines);
      if (overlappingLines.length > 0 && fileCoverage.s[id] === 0) {
        const intersectedLoc = intersectLocationWithLines(loc, overlappingLines);
        if (intersectedLoc) {
          uncovered[relativeFile].statements.push({
            id,
            start: intersectedLoc.start,
            end: intersectedLoc.end,
          });
        }
      }
    });

    // Check uncovered functions
    Object.entries(fileCoverage.fnMap).forEach(([id, fn]) => {
      const functionLines = getLinesFromLocation(fn.loc);
      const overlappingLines = linesIntersect(lines, functionLines);
      if (overlappingLines.length > 0 && fileCoverage.f[id] === 0) {
        const intersectedLoc = intersectLocationWithLines(fn.loc, overlappingLines);
        if (intersectedLoc) {
          uncovered[relativeFile].functions.push({
            id,
            name: fn.name,
            start: intersectedLoc.start,
            end: intersectedLoc.end,
          });
        }
      }
    });

    // Check uncovered branches
    Object.entries(fileCoverage.branchMap).forEach(([id, branch]) => {
      branch.locations.forEach((loc, idx) => {
        const branchLines = getLinesFromLocation(loc);
        const overlappingLines = linesIntersect(lines, branchLines);
        if (overlappingLines.length > 0 && fileCoverage.b[id][idx] === 0) {
          const intersectedLoc = intersectLocationWithLines(loc, overlappingLines);
          if (intersectedLoc) {
            uncovered[relativeFile].branches.push({
              id,
              locationIndex: idx,
              start: intersectedLoc.start,
              end: intersectedLoc.end,
            });
          }
        }
      });
    });

    console.log(relativeFile, uncovered[relativeFile].statements, uncovered[relativeFile].functions, uncovered[relativeFile].branches);
    if(uncovered[relativeFile].statements.length === 0
      && uncovered[relativeFile].functions.length === 0
      && uncovered[relativeFile].branches.length === 0) {
      delete uncovered[relativeFile];
    }
  });

  return uncovered;
}

function groupIntoRanges(lines) {
  const ranges = [];
  if (lines.length === 0) {
    return ranges;
  }

  lines.sort((a, b) => a - b);
  let start = lines[0];
  let end = lines[0];

  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === end + 1) {
      // Contiguous line
      end = lines[i];
    } else {
      // Not contiguous, save the previous range
      ranges.push({ start, end });
      start = lines[i];
      end = lines[i];
    }
  }
  // Push the last range
  ranges.push({ start, end });

  return ranges;
}

/**
 * Generate an artifact report for uncovered lines.
 */
function generateArtifact(uncovered, artifactDir = ARTIFACT_DIR) {
  if (!fs.existsSync(artifactDir)) {
    fs.mkdirSync(artifactDir, { recursive: true });
  }

  const artifactPath = path.join(artifactDir, 'uncovered-lines.json');

  fs.writeFileSync(artifactPath, JSON.stringify(uncovered, null, 2), 'utf-8');
  // eslint-disable-next-line no-console
  console.log(`JSON artifact generated at ${artifactPath}`);
}

/**
 * Generate an HTML report for uncovered lines.
 */
function generateHtmlReport(uncovered, artifactDir = ARTIFACT_DIR) {
  if (!fs.existsSync(artifactDir)) {
    fs.mkdirSync(artifactDir, { recursive: true });
  }

  const artifactPath = path.join(artifactDir, 'uncovered-lines.html');

  if (Object.keys(uncovered).length === 0) {
    const htmlContent = `
      <html>
        <head><title>Coverage Report</title></head>
        <body>
          <h1>Coverage Report</h1>
          <p>All modified lines are covered by tests.</p>
        </body>
      </html>
    `;
    fs.writeFileSync(artifactPath, htmlContent, 'utf-8');
    console.log(`HTML report generated at ${artifactPath}`);
    return;
  }

  let htmlContent = `
    <html>
      <head>
        <title>Uncovered Lines Report</title>
        <style>
          body { font-family: Arial, sans-serif; }
          h1 { color: #333; }
          h2 { color: #555; }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          th, td {
            padding: 8px 12px;
            border: 1px solid #ddd;
            text-align: left;
          }
          th {
            background-color: #f4f4f4;
          }
        </style>
      </head>
      <body>
        <h1>Uncovered Lines Report</h1>
  `;

  Object.entries(uncovered).forEach(([file, data]) => {
    htmlContent += `<h2>${file}</h2>`;

    if (data.statements.length > 0) {
      htmlContent += `<h3>Statements</h3>`;
      htmlContent += `
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Start Line</th>
              <th>End Line</th>
            </tr>
          </thead>
          <tbody>
      `;
      data.statements.forEach((stmt) => {
        htmlContent += `
          <tr>
            <td>${stmt.id || ''}</td>
            <td>${stmt.start.line}</td>
            <td>${stmt.end.line}</td>
          </tr>
        `;
      });
      htmlContent += `
          </tbody>
        </table>
      `;
    }

    if (data.functions.length > 0) {
      htmlContent += `<h3>Functions</h3>`;
      htmlContent += `
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Start Line</th>
              <th>End Line</th>
            </tr>
          </thead>
          <tbody>
      `;
      data.functions.forEach((fn) => {
        htmlContent += `
          <tr>
            <td>${fn.id}</td>
            <td>${fn.name}</td>
            <td>${fn.start.line}</td>
            <td>${fn.end.line}</td>
          </tr>
        `;
      });
      htmlContent += `
          </tbody>
        </table>
      `;
    }

    if (data.branches.length > 0) {
      htmlContent += `<h3>Branches</h3>`;
      htmlContent += `
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Branch Index</th>
              <th>Start Line</th>
              <th>End Line</th>
            </tr>
          </thead>
          <tbody>
      `;
      data.branches.forEach((branch) => {
        htmlContent += `
          <tr>
            <td>${branch.id}</td>
            <td>${branch.locationIndex}</td>
            <td>${branch.start.line}</td>
            <td>${branch.end.line}</td>
          </tr>
        `;
      });
      htmlContent += `
          </tbody>
        </table>
      `;
    }
  });

  htmlContent += `
      </body>
    </html>
  `;

  fs.writeFileSync(artifactPath, htmlContent, 'utf-8');
  console.log(`HTML report generated at ${artifactPath}`);
}

/**
 * Main function to execute the coverage check.
 * Extracted for testing purposes.
 */
async function main({
  coverageFile = COVERAGE_FILE,
  artifactDir = ARTIFACT_DIR,
  githubSubdir = argv['github-subdir'],
  failOnUncovered = argv['fail-on-uncovered'],
  outputFormat = argv['output-format'],
} = {}) {
  try {
    // eslint-disable-next-line no-console
    console.log('Fetching base branch...');
    await fetchBaseBranch();

    // // eslint-disable-next-line no-console
    // console.log('Determining merge base...');
    // const mergeBase = await getMergeBase();
    // // eslint-disable-next-line no-console
    // console.log(`Merge base is: ${mergeBase}`);

    // eslint-disable-next-line no-console
    console.log('Identifying modified lines...');
    const modifiedLines = await getModifiedLines(mergeBase, githubSubdir);

    // eslint-disable-next-line no-console
    console.log('Loading coverage data...');
    const coverageMap = loadCoverage(coverageFile);

    // eslint-disable-next-line no-console
    console.log('Checking coverage...');
    const uncovered = checkCoverage(modifiedLines, coverageMap);

    if (Object.keys(uncovered).length > 0) {
      // eslint-disable-next-line no-console
      console.log('Uncovered lines detected:', uncovered);
      Object.entries(uncovered).forEach(([file, data]) => {
        console.error(`- ${file}:`);
        if (data.statements.length > 0) {
          const lines = data.statements.map((stmt) => stmt.start.line).sort((a, b) => a - b);
          const ranges = groupIntoRanges(lines);
          const rangeStrings = ranges
            .map((range) =>
              range.start === range.end ? `${range.start}` : `${range.start}-${range.end}`,
            )
            .join(', ');
          console.log(`  Statements: ${rangeStrings}`);
        }
        if (data.functions.length > 0) {
          const lines = data.functions.map((fn) => fn.start.line).sort((a, b) => a - b);
          const ranges = groupIntoRanges(lines);
          const rangeStrings = ranges
            .map((range) =>
              range.start === range.end ? `${range.start}` : `${range.start}-${range.end}`,
            )
            .join(', ');
          console.log(`  Functions: ${rangeStrings}`);
        }
        if (data.branches.length > 0) {
          const lines = data.branches.map((branch) => branch.start.line).sort((a, b) => a - b);
          const ranges = groupIntoRanges(lines);
          const rangeStrings = ranges
            .map((range) =>
              range.start === range.end ? `${range.start}` : `${range.start}-${range.end}`,
            )
            .join(', ');
          console.log(`  Branches: ${rangeStrings}`);
        }
      });

      // Generate JSON artifact
      if (outputFormat.includes('json')) {
        generateArtifact(uncovered, artifactDir);
      }

      // Generate HTML report if specified
      if (outputFormat.includes('html')) {
        generateHtmlReport(uncovered, artifactDir);
      }

      if (failOnUncovered) {
        // eslint-disable-next-line no-console
        console.log('Coverage check failed due to uncovered lines.');
        process.exit(1);
      }
    } else {
      // eslint-disable-next-line no-console
      console.log('All modified lines are covered by tests.');

      if (outputFormat.includes('html')) {
        generateHtmlReport(uncovered, artifactDir);
      }
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error during coverage check:', error);
    process.exit(1);
  }
}

// Run the script only if it's the main module
if (require.main === module) {
  main();
}

module.exports = {
  fetchBaseBranch,
  getMergeBase,
  getModifiedLines,
  loadCoverage,
  getLinesFromLocation,
  linesIntersect,
  intersectLocationWithLines,
  checkCoverage,
  groupIntoRanges,
  generateArtifact,
  generateHtmlReport,
  main,
  argv,
  COVERAGE_FILE,
  ARTIFACT_DIR,
};
