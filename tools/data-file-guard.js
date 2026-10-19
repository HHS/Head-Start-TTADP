const FORBIDDEN_PATH_PATTERNS = [
  { pattern: /^hses\//, reason: 'HSES data extracts must not be committed (hses/)' },
  { pattern: /(^|\/)hses\.zip$/, reason: 'HSES data extracts must not be committed (hses.zip)' },
];

const DATA_FILE_PATTERN = /\.(xml|csv|tsv)$/i;
const STAFF_EMAIL_PATTERN = /@acf\.hhs\.gov\b/i;

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

function evaluate({ nameStatusOutput = '', diffText = '' } = {}) {
  const findings = [
    ...findForbiddenPaths(parseNameStatus(nameStatusOutput)),
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
  findStaffEmailsInAddedLines,
  parseNameStatus,
};
