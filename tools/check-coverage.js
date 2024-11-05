// src/tools/check-coverage.js

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import simpleGit from 'simple-git';
import pkg from 'istanbul-lib-coverage';
import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';
import { markdownTable } from 'markdown-table';

const { createCoverageMap } = pkg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const argv = yargs(hideBin(process.argv))
  .option('fail-on-uncovered', {
    alias: 'f',
    type: 'boolean',
    description: 'Fail the script if uncovered lines are detected',
    default: true,
  })
  .option('output-format', {
    alias: 'o',
    type: 'string',
    description: 'Specify output formats (comma-separated, e.g., json,markdown,html)',
    default: 'json,markdown',
  })
  .help()
  .alias('help', 'h')
  .argv;

const COVERAGE_FILE = path.resolve(__dirname, '../coverage/coverage-final.json');
const BASE_BRANCH = 'main';
// Directory to store artifacts
const ARTIFACT_DIR = path.resolve(__dirname, '../coverage-artifacts');

/**
 * Fetch the base branch to ensure it's up-to-date.
 */
async function fetchBaseBranch() {
  const git = simpleGit();
  await git.fetch();
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
 * Get the list of modified or added lines in the PR.
 */
async function getModifiedLines(mergeBase) {
  const git = simpleGit();
  const diffFiles = await git.diff(['--name-only', `${mergeBase}..HEAD`]);
  const files = diffFiles
    .split('\n')
    .filter((file) => /\.(js|jsx|ts|tsx)$/.test(file));

  const modifiedLines = {};

  for (const file of files) {
    // Log the file being processed
    // eslint-disable-next-line no-console
    console.log(file);
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
function loadCoverage() {
  if (!fs.existsSync(COVERAGE_FILE)) {
    // eslint-disable-next-line no-console
    console.error(`Coverage file not found at ${COVERAGE_FILE}`);
    process.exit(1);
  }

  const coverageData = JSON.parse(fs.readFileSync(COVERAGE_FILE, 'utf8'));
  const coverageMap = createCoverageMap(coverageData);
  return coverageMap;
}

/**
 * Check if modified lines are covered.
 */
function checkCoverage(modifiedLines, coverageMap) {
  const uncovered = {};

  Object.entries(modifiedLines).forEach(([file, lines]) => {
    // eslint-disable-next-line no-console
    console.log('checkCoverage:', file);
    // Normalize file path to match coverage map keys
    const normalizedFile = path.relative(process.cwd(), path.resolve(__dirname, '../../', file));

    let fileCoverage;
    try {
      fileCoverage = coverageMap.fileCoverageFor(normalizedFile);
    } catch (e) {
      // If the file is not in the coverage report, consider all lines uncovered
      // eslint-disable-next-line no-console
      console.log('checkCoverage:', file, lines);
      if (!uncovered[file]) {
        uncovered[file] = [];
      }
      uncovered[file].push(...lines);
      return;
    }

    const detailedCoverage = fileCoverage.toJSON().lines.details;

    lines.forEach((line) => {
      // eslint-disable-next-line no-console
      console.log('checkCoverage:', file, line);
      const lineCoverage = detailedCoverage.find((detail) => detail.line === line);
      if (!lineCoverage || lineCoverage.hit === 0) {
        if (!uncovered[file]) {
          uncovered[file] = [];
        }
        uncovered[file].push(line);
      }
    });
  });

  // Sort and deduplicate the uncovered lines per file
  Object.keys(uncovered).forEach((file) => {
    uncovered[file] = Array.from(new Set(uncovered[file])).sort((a, b) => a - b);
  });

  return uncovered;
}

function groupIntoRanges(lines) {
  const ranges = [];
  if (lines.length === 0) {
    return ranges;
  }

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
 * Generate a Markdown report for uncovered lines.
 */
function generateMarkdownReport(uncovered) {
  if (!fs.existsSync(ARTIFACT_DIR)) {
    fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  }

  const artifactPath = path.join(ARTIFACT_DIR, 'uncovered-lines.md');

  if (uncovered.length === 0) {
    fs.writeFileSync(
      artifactPath,
      '# Coverage Report\n\nAll modified lines are covered by tests.',
      'utf-8',
    );
    // eslint-disable-next-line no-console
    console.log(`Markdown report generated at ${artifactPath}`);
    return;
  }

  const table = [['File', 'Line Ranges']];

  Object.entries(uncovered).forEach(([file, lines]) => {
    const ranges = groupIntoRanges(lines);
    const rangeStrings = ranges
      .map((range) => (range.start === range.end ? `${range.start}` : `${range.start}-${range.end}`))
      .join(', ');
    table.push([file, rangeStrings]);
  });

  const markdownContent = `# Uncovered Lines Report

The following lines are not covered by tests:

${markdownTable(table)}
`;

  fs.writeFileSync(artifactPath, markdownContent, 'utf-8');
  // eslint-disable-next-line no-console
  console.log(`Markdown report generated at ${artifactPath}`);
}

/**
 * Generate an artifact report for uncovered lines.
 */
function generateArtifact(uncovered) {
  if (!fs.existsSync(ARTIFACT_DIR)) {
    fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  }

  const artifactPath = path.join(ARTIFACT_DIR, 'uncovered-lines.json');

  // Convert uncovered to include ranges
  const result = {};

  Object.entries(uncovered).forEach(([file, lines]) => {
    const ranges = groupIntoRanges(lines);
    result[file] = ranges;
  });

  fs.writeFileSync(artifactPath, JSON.stringify(result, null, 2), 'utf-8');
  // eslint-disable-next-line no-console
  console.log(`JSON artifact generated at ${artifactPath}`);
}

/**
 * Generate an HTML report for uncovered lines.
 */
function generateHtmlReport(uncovered) {
  if (!fs.existsSync(ARTIFACT_DIR)) {
    fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  }

  const artifactPath = path.join(ARTIFACT_DIR, 'uncovered-lines.html');

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

  let tableRows = '';

  Object.entries(uncovered).forEach(([file, lines]) => {
    const ranges = groupIntoRanges(lines);
    const rangeStrings = ranges
      .map((range) => (range.start === range.end ? `${range.start}` : `${range.start}-${range.end}`))
      .join(', ');

    tableRows += `
      <tr>
        <td>${file}</td>
        <td>${rangeStrings}</td>
      </tr>
    `;
  });

  const htmlContent = `
    <html>
      <head>
        <title>Uncovered Lines Report</title>
        <style>
          table {
            width: 100%;
            border-collapse: collapse;
          }
          th, td {
            padding: 8px 12px;
            border: 1px solid #ddd;
          }
          th {
            background-color: #f4f4f4;
          }
        </style>
      </head>
      <body>
        <h1>Uncovered Lines Report</h1>
        <table>
          <thead>
            <tr>
              <th>File</th>
              <th>Line Ranges</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
      </body>
    </html>
  `;

  fs.writeFileSync(artifactPath, htmlContent, 'utf-8');
  console.log(`HTML report generated at ${artifactPath}`);
}

(async () => {
  try {
    // eslint-disable-next-line no-console
    console.log('Fetching base branch...');
    await fetchBaseBranch();

    // eslint-disable-next-line no-console
    console.log('Determining merge base...');
    const mergeBase = await getMergeBase();
    // eslint-disable-next-line no-console
    console.log(`Merge base is: ${mergeBase}`);

    // eslint-disable-next-line no-console
    console.log('Identifying modified lines...');
    const modifiedLines = await getModifiedLines(mergeBase);

    // eslint-disable-next-line no-console
    console.log('Loading coverage data...');
    const coverageMap = loadCoverage();

    // eslint-disable-next-line no-console
    console.log('Checking coverage...');
    const uncovered = checkCoverage(modifiedLines, coverageMap);

    if (uncovered.length > 0) {
      // eslint-disable-next-line no-console
      console.error('Uncovered lines detected:');
      Object.entries(uncovered).forEach(([file, lines]) => {
        const ranges = groupIntoRanges(lines);
        const rangeStrings = ranges
          .map((range) => (range.start === range.end ? `${range.start}` : `${range.start}-${range.end}`))
          .join(', ');
        console.error(`- ${file}: ${rangeStrings}`);
      });

      // Generate JSON artifact
      generateArtifact(uncovered);

      // Generate Markdown report if specified
      if (argv['output-format'].includes('markdown')) {
        generateMarkdownReport(uncovered);
      }

      // Generate HTML report if specified
      if (argv['output-format'].includes('html')) {
        generateHtmlReport(uncovered);
      }

      if (argv['fail-on-uncovered']) {
        // eslint-disable-next-line no-console
        console.error('Coverage check failed due to uncovered lines.');
        process.exit(1);
      }
    } else {
      // eslint-disable-next-line no-console
      console.log('All modified lines are covered by tests.');

      // Optionally, generate empty reports
      if (argv['output-format'].includes('markdown')) {
        generateMarkdownReport(uncovered);
      }
      if (argv['output-format'].includes('html')) {
        generateHtmlReport(uncovered);
      }
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error during coverage check:', error);
    process.exit(1);
  }
})();
