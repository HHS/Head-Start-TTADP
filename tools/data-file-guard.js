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

function parseNameStatus(nameStatusOutput = '') {
  return nameStatusOutput
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [status, ...pathParts] = line.split('\t');
      return { status, path: pathParts.join('\t') };
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

function parseNumstat(numstatOutput = '') {
  return numstatOutput
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [added, , ...pathParts] = line.split('\t');
      // Binary files report "-"; treat them as zero added lines.
      return { path: pathParts.join('\t'), addedLines: Number.parseInt(added, 10) || 0 };
    })
    .filter(({ path }) => path);
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

// Scans a `git diff --unified=0` for added lines in data files that contain real staff
// email addresses. Matched text is never returned, so CI logs do not repeat personal data.
function findStaffEmailsInAddedLines(diffText = '') {
  const findings = [];
  let currentPath = null;
  let currentLine = 0;
  let inDataFile = false;

  diffText.split('\n').forEach((line) => {
    if (line.startsWith('+++ ')) {
      currentPath = line.slice(4).replace(/^b\//, '');
      inDataFile = currentPath !== '/dev/null' && DATA_FILE_PATTERN.test(currentPath);
      return;
    }

    const hunk = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    if (hunk) {
      currentLine = Number(hunk[1]);
      return;
    }

    if (line.startsWith('+') && !line.startsWith('+++')) {
      if (inDataFile && STAFF_EMAIL_PATTERN.test(line)) {
        findings.push({
          path: currentPath,
          line: currentLine,
          reason: 'Added line in a data file contains a staff email address (@acf.hhs.gov)',
        });
      }
      currentLine += 1;
    }
  });

  return findings;
}

function evaluate({ nameStatusOutput = '', numstatOutput = '', diffText = '' } = {}) {
  const changes = parseNameStatus(nameStatusOutput);
  const findings = [
    ...findForbiddenPaths(changes),
    ...findHsesExtractFiles(changes, parseNumstat(numstatOutput)),
    ...findStaffEmailsInAddedLines(diffText),
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

module.exports = {
  evaluate,
  findForbiddenPaths,
  findHsesExtractFiles,
  findStaffEmailsInAddedLines,
  parseNameStatus,
  parseNumstat,
};
