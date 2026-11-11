// Parses the NDJSON report printed by `yarn npm audit --json` (Yarn 4).
//
// Each line describes one advisory affecting one package:
//   {"value":"<package>","children":{"ID":1240853,"Issue":"...","URL":"https://github.com/advisories/GHSA-...",
//     "Severity":"high","Vulnerable Versions":"<=6.2.0","Tree Versions":["5.3.1"],"Dependents":["get-uri@npm:8.0.1"]}}
//
// Yarn prints the registry response as-is, so this module is the single place that knows its shape.

const YARN_NPM_AUDIT_ARGS = [
  'npm',
  'audit',
  '--recursive',
  '--environment',
  'production',
  '--no-deprecations',
  '--severity',
  'low',
  '--json',
];

const YARN_NPM_AUDIT_COMMAND = `yarn ${YARN_NPM_AUDIT_ARGS.join(' ')}`;

// GitHub advisory IDs look like GHSA-xxxx-xxxx-xxxx; match loosely so a format tweak doesn't drop IDs.
const GHSA_PATTERN = /GHSA(?:-[0-9a-z]+)+/i;

function extractGhsa(url) {
  const match = typeof url === 'string' ? url.match(GHSA_PATTERN) : null;
  return match ? match[0] : null;
}

// Converts a Yarn locator such as `nise@npm:5.1.9`,
// `@scope/pkg@virtual:<hash>#npm:0.201.1`, or `app@workspace:.` into `name@version` (or `name`).
function formatDependent(locator) {
  if (typeof locator !== 'string' || !locator) {
    return null;
  }

  const separator = locator.indexOf('@', 1);
  if (separator === -1) {
    return locator;
  }

  const name = locator.slice(0, separator);
  let reference = locator.slice(separator + 1);
  const hashIndex = reference.lastIndexOf('#');
  if (hashIndex !== -1) {
    reference = reference.slice(hashIndex + 1);
  }

  if (reference.startsWith('workspace:')) {
    return name;
  }

  return `${name}@${reference.replace(/^npm:/, '')}`;
}

function toStringArray(value, fieldName) {
  if (value === undefined || value === null) {
    return [];
  }
  if (!Array.isArray(value)) {
    throw new Error(`Yarn audit field "${fieldName}" must be an array`);
  }
  return value.filter((entry) => typeof entry === 'string' && entry);
}

// Returns a normalized advisory, or null when the line is not an advisory row.
function normalizeAuditRow(row) {
  const details = row?.children;
  if (!row?.value || !details || typeof details !== 'object') {
    return null;
  }

  const advisoryId = details.ID ?? null;
  // Deprecation notices use string IDs such as "pkg (deprecation)"; they are not vulnerabilities.
  if (typeof advisoryId === 'string' && advisoryId.endsWith('(deprecation)')) {
    return null;
  }

  const dependents = toStringArray(details.Dependents, 'Dependents')
    .map(formatDependent)
    .filter(Boolean);

  return {
    module: row.value,
    advisoryId,
    ghsa: extractGhsa(details.URL),
    url: details.URL || null,
    title: details.Issue || null,
    severity: typeof details.Severity === 'string' ? details.Severity.toLowerCase() : null,
    vulnerableVersions: details['Vulnerable Versions'] || null,
    versions: [...new Set(toStringArray(details['Tree Versions'], 'Tree Versions'))].sort(),
    dependents: [...new Set(dependents)].sort(),
  };
}

// Parses NDJSON text into normalized advisories. Blank lines are ignored; malformed JSON throws so
// that a truncated or corrupted report never reads as "no findings".
function parseYarnNpmAudit(text) {
  return String(text || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      try {
        return JSON.parse(line);
      } catch (error) {
        throw new Error(`Unable to parse Yarn audit output line ${index + 1}: ${error.message}`);
      }
    })
    .map(normalizeAuditRow)
    .filter(Boolean);
}

// Stable identity for one advisory affecting one installed version of a package.
function advisoryKey(advisory, version) {
  const id =
    advisory.ghsa || (advisory.advisoryId !== null ? `NPM-${advisory.advisoryId}` : 'UNKNOWN');
  return `${id}|${advisory.module}@${version}`;
}

module.exports = {
  YARN_NPM_AUDIT_ARGS,
  YARN_NPM_AUDIT_COMMAND,
  advisoryKey,
  extractGhsa,
  formatDependent,
  normalizeAuditRow,
  parseYarnNpmAudit,
};
