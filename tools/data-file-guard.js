const { execFileSync } = require('node:child_process');

const FORBIDDEN_PATH_PATTERNS = [
  { pattern: /^hses\//, reason: 'HSES data extracts must not be committed (hses/)' },
  { pattern: /(^|\/)hses\.zip$/, reason: 'HSES data extracts must not be committed (hses.zip)' },
];

const DATA_FILE_PATTERN = /\.(xml|csv|tsv)$/i;
const STAFF_EMAIL_PATTERN = /@acf\.hhs\.gov\b/i;

// The files inside the nightly HSES zip. Small synthetic copies live in temp/ as test
// fixtures, so these names are only allowed there and only at fixture size (the largest
// fixture is a few hundred lines; a real extract is tens of thousands).
const HSES_EXTRACT_FILE_NAMES = new Set([
  'agency.xml',
  'grant_agency.xml',
  'grant_award.xml',
  'grant_award_replacement.xml',
  'grant_program.xml',
]);
const HSES_FIXTURE_DIRECTORY = 'temp/';
const MAX_FIXTURE_ADDED_LINES = 1000;

const GIT_MAX_BUFFER = 512 * 1024 * 1024;

const isDataFile = (path) => DATA_FILE_PATTERN.test(path);

// Parses `git diff -z --name-status --no-renames`: NUL separated "status, path" pairs.
// Paths come through verbatim, so spaces and non ASCII names are not quoted or escaped.
function parseNameStatus(nameStatusOutput = '') {
  const tokens = nameStatusOutput.split('\0').filter((token) => token !== '');
  const changes = [];

  for (let i = 0; i + 1 < tokens.length; i += 2) {
    changes.push({ status: tokens[i], path: tokens[i + 1] });
  }

  return changes;
}

// Parses `git diff -z --numstat --no-renames`: NUL terminated "added<TAB>deleted<TAB>path".
function parseNumstat(numstatOutput = '') {
  return numstatOutput
    .split('\0')
    .filter((record) => record !== '')
    .map((record) => {
      const [added, , ...pathParts] = record.split('\t');
      // Binary files report "-"; treat them as zero added lines.
      return { path: pathParts.join('\t'), addedLines: Number.parseInt(added, 10) || 0 };
    })
    .filter(({ path }) => path);
}

function findForbiddenPaths(changes = []) {
  return changes
    .filter(({ status }) => !status.startsWith('D'))
    .flatMap(({ path }) =>
      FORBIDDEN_PATH_PATTERNS.filter(({ pattern }) => pattern.test(path)).map(({ reason }) => ({
        path,
        reason,
      }))
    );
}

// Flags files named like the ones in the HSES zip when they are outside temp/, or inside
// temp/ but too large to be a fixture. Paths already caught by findForbiddenPaths are skipped.
function findHsesExtractFiles(changes = [], numstatRows = []) {
  const addedLinesByPath = new Map(numstatRows.map(({ path, addedLines }) => [path, addedLines]));
  const alreadyForbidden = new Set(findForbiddenPaths(changes).map(({ path }) => path));

  return changes
    .filter(({ status }) => !status.startsWith('D'))
    .filter(({ path }) => !alreadyForbidden.has(path))
    .filter(({ path }) => HSES_EXTRACT_FILE_NAMES.has(path.split('/').pop()))
    .flatMap(({ path }) => {
      if (!path.startsWith(HSES_FIXTURE_DIRECTORY)) {
        return [
          {
            path,
            reason: `File name matches an HSES extract file; only synthetic fixtures in ${HSES_FIXTURE_DIRECTORY} are allowed`,
          },
        ];
      }

      const addedLines = addedLinesByPath.get(path) || 0;
      if (addedLines > MAX_FIXTURE_ADDED_LINES) {
        return [
          {
            path,
            reason: `Adds ${addedLines} lines to an HSES extract file name, which looks like a real extract and not a fixture (limit ${MAX_FIXTURE_ADDED_LINES})`,
          },
        ];
      }

      return [];
    });
}

// Scans the `git diff --unified=0` of ONE file for added lines that contain real staff email
// addresses. The path is supplied by the caller (from NUL delimited git output), so the patch
// headers are never parsed. Matched text is never returned, so CI logs do not repeat personal data.
function findStaffEmailsInAddedLines(path, diffText = '') {
  const findings = [];
  let currentLine = 0;
  let inHunk = false;

  diffText.split('\n').forEach((line) => {
    const hunk = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    if (hunk) {
      currentLine = Number(hunk[1]);
      inHunk = true;
      return;
    }

    // Everything before the first hunk is patch header, not file content.
    if (!inHunk || !line.startsWith('+')) {
      return;
    }

    if (STAFF_EMAIL_PATTERN.test(line)) {
      findings.push({
        path,
        line: currentLine,
        reason: 'Added line in a data file contains a staff email address (@acf.hhs.gov)',
      });
    }
    currentLine += 1;
  });

  return findings;
}

function evaluate({ nameStatusOutput = '', numstatOutput = '', fileDiffs = [] } = {}) {
  const changes = parseNameStatus(nameStatusOutput);
  const findings = [
    ...findForbiddenPaths(changes),
    ...findHsesExtractFiles(changes, parseNumstat(numstatOutput)),
    ...fileDiffs.flatMap(({ path, diffText }) => findStaffEmailsInAddedLines(path, diffText)),
  ];

  if (findings.length === 0) {
    return { valid: true, findings, message: 'No forbidden data files or staff emails found.' };
  }

  const details = findings
    .map(({ path, line, reason }) => `- ${path}${line ? `:${line}` : ''}: ${reason}`)
    .join('\n');

  return {
    valid: false,
    findings,
    message: `Data file guard failed:\n${details}\n\nRemove these files or lines from the PR. If this is a real incident, tell your System Owner and SSPO. Test fixtures must use synthetic data.`,
  };
}

// Runs the guard against `baseRef...HEAD` in the git repository at `cwd`.
function checkRange({ baseRef, cwd = process.cwd() } = {}) {
  const git = (...args) =>
    execFileSync('git', args, { cwd, encoding: 'utf8', maxBuffer: GIT_MAX_BUFFER });
  const range = `${baseRef}...HEAD`;
  const baseArgs = ['diff', '--no-renames', '--no-ext-diff', '--no-textconv'];

  const nameStatusOutput = git(...baseArgs, '-z', '--name-status', range);
  const numstatOutput = git(...baseArgs, '-z', '--numstat', range);

  // Data files are chosen here, case insensitively, from verbatim paths. Each gets its own
  // diff through a literal pathspec, so names with spaces, quotes, or non ASCII characters
  // are scanned like any other.
  const fileDiffs = parseNameStatus(nameStatusOutput)
    .filter(({ status, path }) => !status.startsWith('D') && isDataFile(path))
    .map(({ path }) => ({
      path,
      diffText: git(...baseArgs, '--unified=0', range, '--', `:(literal)${path}`),
    }));

  return evaluate({ nameStatusOutput, numstatOutput, fileDiffs });
}

module.exports = {
  checkRange,
  evaluate,
  findForbiddenPaths,
  findHsesExtractFiles,
  findStaffEmailsInAddedLines,
  isDataFile,
  parseNameStatus,
  parseNumstat,
};
