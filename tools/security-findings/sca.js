const fs = require('node:fs');

const {
  DEFAULT_BACKEND_AUDIT_PATH,
  DEFAULT_BACKEND_BASELINE_PATH,
  DEFAULT_FRONTEND_AUDIT_PATH,
  DEFAULT_FRONTEND_BASELINE_PATH,
  DEFAULT_SCAN_TYPES_PATH,
} = require('./constants');
const { loadScanTypes, mapSeverity } = require('./scan-types');
const {
  buildScaFindingId,
  operationalDate,
  resolveProjectPath,
  writeJson,
} = require('./utilities');
const { parseYarnNpmAudit } = require('./yarn-npm-audit');

// Reads a `yarn npm audit --json` report and returns one finding per advisory, package and
// installed version. `paths` holds the direct dependents Yarn reports for the package.
function collectAuditAdvisoriesFromFile({
  auditPath,
  scope,
  scanTypes,
  baselineDate = operationalDate(),
  cwd = process.cwd(),
} = {}) {
  const resolvedAuditPath = resolveProjectPath(auditPath, cwd);
  const advisories = parseYarnNpmAudit(fs.readFileSync(resolvedAuditPath, 'utf8'));
  const findingsById = new Map();

  advisories.forEach((advisory) => {
    if (!advisory.ghsa) {
      return;
    }

    advisory.versions.forEach((version) => {
      const id = buildScaFindingId(scope, advisory.ghsa, advisory.module, version);
      const existing = findingsById.get(id);

      if (existing) {
        existing.paths = [...new Set([...existing.paths, ...advisory.dependents])].sort();
        return;
      }

      findingsById.set(id, {
        id,
        scope,
        scannerFindingId: advisory.ghsa,
        module: advisory.module,
        affectedVersion: version,
        title: advisory.title || `${advisory.module} advisory`,
        sourceSeverity: advisory.severity,
        severity: mapSeverity(scanTypes, 'yarn-audit', advisory.severity),
        firstDetected: baselineDate,
        lastObserved: baselineDate,
        advisoryId: advisory.advisoryId,
        advisoryUrl: advisory.url,
        vulnerableVersions: advisory.vulnerableVersions,
        // Yarn 4 audit output does not include patched versions, recommendations, CVEs, CWEs or CVSS.
        patchedVersions: null,
        recommendation: null,
        cves: [],
        cwe: [],
        cvss: null,
        paths: [...advisory.dependents],
      });
    });
  });

  return [...findingsById.values()].sort((left, right) => left.id.localeCompare(right.id));
}

function createScaBaseline({
  auditPath,
  scope,
  baselinePath,
  scanTypesPath = DEFAULT_SCAN_TYPES_PATH,
  generatedAt = new Date().toISOString(),
  cwd = process.cwd(),
} = {}) {
  const scanTypes = loadScanTypes(scanTypesPath, cwd);
  const baselineDate = operationalDate(generatedAt);
  const findings = collectAuditAdvisoriesFromFile({
    auditPath,
    scope,
    scanTypes,
    baselineDate,
    cwd,
  });

  const baseline = {
    baselineDate,
    generatedAt,
    scope,
    scanner: {
      name: 'yarn-audit',
      sourceFile: auditPath,
    },
    findings,
  };

  writeJson(resolveProjectPath(baselinePath, cwd), baseline);
  return baseline;
}

function createScaBaselines({
  backendAuditPath = DEFAULT_BACKEND_AUDIT_PATH,
  frontendAuditPath = DEFAULT_FRONTEND_AUDIT_PATH,
  backendBaselinePath = DEFAULT_BACKEND_BASELINE_PATH,
  frontendBaselinePath = DEFAULT_FRONTEND_BASELINE_PATH,
  scanTypesPath = DEFAULT_SCAN_TYPES_PATH,
  generatedAt = new Date().toISOString(),
  cwd = process.cwd(),
} = {}) {
  const backend = createScaBaseline({
    auditPath: backendAuditPath,
    scope: 'backend',
    baselinePath: backendBaselinePath,
    scanTypesPath,
    generatedAt,
    cwd,
  });
  const frontend = createScaBaseline({
    auditPath: frontendAuditPath,
    scope: 'frontend',
    baselinePath: frontendBaselinePath,
    scanTypesPath,
    generatedAt,
    cwd,
  });

  return { backend, frontend };
}

module.exports = {
  collectAuditAdvisoriesFromFile,
  createScaBaseline,
  createScaBaselines,
};
