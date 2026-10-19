const { execFileSync } = require('node:child_process');

const FORBIDDEN_PATH_PATTERNS = [
  { pattern: /^hses\//i, reason: 'HSES data extracts must not be committed (hses/)' },
  { pattern: /(^|\/)hses\.zip$/i, reason: 'HSES data extracts must not be committed (hses.zip)' },
];

const DATA_FILE_PATTERN = /\.(xml|csv|tsv)$/i;
const STAFF_EMAIL_PATTERN = /@acf\.hhs\.gov\b/i;

// The files inside the nightly HSES zip. Small synthetic copies live in temp/ as test
// fixtures, so these names are only allowed there and only at fixture size. The largest
// fixture is about 17 KB and a few hundred lines; a real extract is megabytes and tens of
// thousands of lines. The limits apply to the whole file as it will be in HEAD, not to the
// lines a PR adds, so one long line or growth across several small PRs cannot get past them.
const HSES_EXTRACT_FILE_NAMES = new Set([
  'agency.xml',
  'grant_agency.xml',
  'grant_award.xml',
  'grant_award_replacement.xml',
  'grant_program.xml',
]);
const HSES_FIXTURE_DIRECTORY = 'temp/';
const MAX_FIXTURE_LINES = 1000;
const MAX_FIXTURE_BYTES = 100 * 1024;

const GIT_MAX_BUFFER = 512 * 1024 * 1024;

// Raised for any failure to run the guard. Its message never includes git output, because
// git output can contain the patch text (and so staff email addresses) the guard exists to
// keep out of logs.
class GuardError extends Error {
  constructor(message) {
    super(message);
    this.name = 'GuardError';
  }
}

const isDataFile = (path) => DATA_FILE_PATTERN.test(path);

const isHsesExtractName = (path) =>
  HSES_EXTRACT_FILE_NAMES.has(path.split('/').pop().toLowerCase());

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
      // Binary files report "-" instead of a line count, so mark them rather than treating
      // them as zero lines.
      const binary = added === '-';
      return {
        path: pathParts.join('\t'),
        addedLines: binary ? 0 : Number.parseInt(added, 10) || 0,
        binary,
      };
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
// temp/ but too large to be a fixture. `blobStats` holds the size of each such file as it will
// be in HEAD: [{ path, bytes, lines }] (lines is null when the file was too big to read).
// Paths already caught by findForbiddenPaths are skipped.
function findHsesExtractFiles(changes = [], blobStats = []) {
  const statsByPath = new Map(blobStats.map((stats) => [stats.path, stats]));
  const alreadyForbidden = new Set(findForbiddenPaths(changes).map(({ path }) => path));

  return changes
    .filter(({ status }) => !status.startsWith('D'))
    .filter(({ path }) => !alreadyForbidden.has(path))
    .filter(({ path }) => isHsesExtractName(path))
    .flatMap(({ path }) => {
      if (!path.startsWith(HSES_FIXTURE_DIRECTORY)) {
        return [
          {
            path,
            reason: `File name matches an HSES extract file; only synthetic fixtures in ${HSES_FIXTURE_DIRECTORY} are allowed`,
          },
        ];
      }

      const { bytes = 0, lines = 0 } = statsByPath.get(path) || {};
      if (bytes > MAX_FIXTURE_BYTES) {
        return [
          {
            path,
            reason: `File is ${bytes} bytes (limit ${MAX_FIXTURE_BYTES}), which looks like a real HSES extract and not a fixture`,
          },
        ];
      }

      if (lines > MAX_FIXTURE_LINES) {
        return [
          {
            path,
            reason: `File has ${lines} lines (limit ${MAX_FIXTURE_LINES}), which looks like a real HSES extract and not a fixture`,
          },
        ];
      }

      return [];
    });
}

// Git reports files with NUL bytes (for example UTF-16 exports) as binary and produces no
// patch lines for them, so the email scan cannot read them. Reject them instead of letting
// them through unscanned.
function findBinaryDataFiles(changes = [], numstatRows = []) {
  const binaryPaths = new Set(numstatRows.filter(({ binary }) => binary).map(({ path }) => path));

  return changes
    .filter(({ status }) => !status.startsWith('D'))
    .filter(({ path }) => isDataFile(path) && binaryPaths.has(path))
    .map(({ path }) => ({
      path,
      reason:
        'Binary data file (for example UTF-16) cannot be scanned for staff emails; save it as UTF-8 text',
    }));
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

function evaluate({
  nameStatusOutput = '',
  numstatOutput = '',
  blobStats = [],
  fileDiffs = [],
} = {}) {
  const changes = parseNameStatus(nameStatusOutput);
  const numstatRows = parseNumstat(numstatOutput);
  const findings = [
    ...findForbiddenPaths(changes),
    ...findHsesExtractFiles(changes, blobStats),
    ...findBinaryDataFiles(changes, numstatRows),
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

const countLines = (text) => {
  if (text === '') {
    return 0;
  }
  return text.split('\n').length - (text.endsWith('\n') ? 1 : 0);
};

// Runs git and returns its output. On failure it throws a GuardError that names only the git
// subcommand and the exit status or error code. The original error is deliberately not
// chained or logged: it carries the captured output, which may be patch text.
function runGit({ cwd, maxBuffer }, args) {
  try {
    return execFileSync('git', args, { cwd, encoding: 'utf8', maxBuffer });
  } catch (error) {
    const code = error && typeof error.code === 'string' ? ` (${error.code})` : '';
    const status = error && typeof error.status === 'number' ? ` (exit ${error.status})` : '';
    throw new GuardError(`git ${args[0]} failed${code}${status}`);
  }
}

// Runs the guard against `baseRef...HEAD` in the git repository at `cwd`.
function checkRange({ baseRef, cwd = process.cwd(), maxBuffer = GIT_MAX_BUFFER } = {}) {
  const git = (...args) => runGit({ cwd, maxBuffer }, args);
  const range = `${baseRef}...HEAD`;
  const baseArgs = ['diff', '--no-renames', '--no-ext-diff', '--no-textconv'];

  const nameStatusOutput = git(...baseArgs, '-z', '--name-status', range);
  const numstatOutput = git(...baseArgs, '-z', '--numstat', range);
  const changes = parseNameStatus(nameStatusOutput).filter(({ status }) => !status.startsWith('D'));

  // Size of each possible fixture as it will be in HEAD. The size is read first, and the
  // content only when the file is small enough to be a fixture, so a huge file is rejected
  // without reading it into memory.
  const blobStats = changes
    .filter(({ path }) => path.startsWith(HSES_FIXTURE_DIRECTORY) && isHsesExtractName(path))
    .map(({ path }) => {
      const bytes = Number.parseInt(git('cat-file', '-s', `HEAD:${path}`), 10);
      const lines =
        bytes > MAX_FIXTURE_BYTES ? null : countLines(git('cat-file', 'blob', `HEAD:${path}`));
      return { path, bytes, lines };
    });

  // Data files are chosen here, case insensitively, from verbatim paths. Each gets its own
  // diff through a literal pathspec, so names with spaces, quotes, or non ASCII characters
  // are scanned like any other.
  const fileDiffs = changes
    .filter(({ path }) => isDataFile(path))
    .map(({ path }) => ({
      path,
      diffText: git(...baseArgs, '--unified=0', range, '--', `:(literal)${path}`),
    }));

  return evaluate({ nameStatusOutput, numstatOutput, blobStats, fileDiffs });
}

module.exports = {
  GuardError,
  MAX_FIXTURE_BYTES,
  MAX_FIXTURE_LINES,
  checkRange,
  evaluate,
  findBinaryDataFiles,
  findForbiddenPaths,
  findHsesExtractFiles,
  findStaffEmailsInAddedLines,
  isDataFile,
  parseNameStatus,
  parseNumstat,
};
