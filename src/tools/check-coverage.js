// src/tools/check-coverage.js

const fs = require('fs');
const path = require('path');
const simpleGit = require('simple-git');
const { createCoverageMap } = require('istanbul-lib-coverage');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const markdownTable = require('markdown-table');

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

const COVERAGE_FILE = path.resolve(__dirname, '../../coverage/coverage-final.json');
const BASE_BRANCH = 'origin/main'; // Update if your main branch has a different name
// Directory to store artifacts
const ARTIFACT_DIR = path.resolve(__dirname, '../../coverage-artifacts');

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
    .filter(file => /\.(js|jsx|ts|tsx)$/.test(file));

  const modifiedLines = {};

  for (const file of files) {
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
        modifiedLines[file].add(i);
      }
    }
  }

  // Convert sets to arrays
  for (const file in modifiedLines) {
    modifiedLines[file] = Array.from(modifiedLines[file]);
  }

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
  let uncovered = [];

  for (const [file, lines] of Object.entries(modifiedLines)) {
    // Normalize file path to match coverage map keys
    const normalizedFile = path.relative(process.cwd(), path.resolve(__dirname, '../../', file));

    let fileCoverage;
    try {
      fileCoverage = coverageMap.fileCoverageFor(normalizedFile);
    } catch (e) {
      // If the file is not in the coverage report, consider all lines uncovered
      lines.forEach(line => {
        uncovered.push({ file, line });
      });
      continue;
    }

    const detailedCoverage = fileCoverage.toJSON().lines.details;

    lines.forEach(line => {
      const lineCoverage = detailedCoverage.find(detail => detail.line === line);
      if (!lineCoverage || lineCoverage.hit === 0) {
        uncovered.push({ file, line });
      }
    });
  }

  return uncovered;
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

  const table = [
    ['File', 'Line Number'],
    ...uncovered.map(entry => [entry.file, entry.line.toString()]),
  ];

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
  fs.writeFileSync(artifactPath, JSON.stringify(uncovered, null, 2), 'utf-8');
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

  if (uncovered.length === 0) {
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
    // eslint-disable-next-line no-console
    console.log(`HTML report generated at ${artifactPath}`);
    return;
  }

  const tableRows = uncovered.map(entry => `
    <tr>
      <td>${entry.file}</td>
      <td>${entry.line}</td>
    </tr>
  `).join('');

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
              <th>Line Number</th>
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
  // eslint-disable-next-line no-console
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
      uncovered.forEach(({ file, line }) => {
        // eslint-disable-next-line no-console
        console.error(`- ${file}:${line}`);
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
