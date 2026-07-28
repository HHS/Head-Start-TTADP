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
  validateArray,
  writeJson,
} = require('./utilities');

function parseJsonLines(filePath) {
  return fs
    .readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function collectPathsFromFinding(finding) {
  const paths = new Set();
  validateArray(finding.paths || [], 'advisory.findings[].paths').forEach((findingPath) => {
    if (findingPath) {
      paths.add(findingPath);
    }
  });

  return [...paths].sort();
}

function collectAuditAdvisoriesFromFile({
  auditPath,
  scope,
  scanTypes,
  baselineDate = operationalDate(),
  cwd = process.cwd(),
} = {}) {
  const resolvedAuditPath = resolveProjectPath(auditPath, cwd);
  const rows = parseJsonLines(resolvedAuditPath).filter((row) => row.type === 'auditAdvisory');
  const findingsById = new Map();

  rows.forEach((row) => {
    const advisory = row.data?.advisory;
    if (!advisory?.github_advisory_id || !advisory?.module_name) {
      return;
    }

    validateArray(advisory.findings || [], 'advisory.findings').forEach((finding) => {
      if (!finding.version) {
        return;
      }

      const id = buildScaFindingId(
        scope,
        advisory.github_advisory_id,
        advisory.module_name,
        finding.version
      );
      const existing = findingsById.get(id);
      const sourcePaths = collectPathsFromFinding(finding);

      if (existing) {
        existing.paths = [...new Set([...existing.paths, ...sourcePaths])].sort();
        return;
      }

      findingsById.set(id, {
        id,
        scope,
        scannerFindingId: advisory.github_advisory_id,
        module: advisory.module_name,
        affectedVersion: finding.version,
        title: advisory.title || `${advisory.module_name} advisory`,
        sourceSeverity: advisory.severity,
        severity: mapSeverity(scanTypes, 'yarn-audit', advisory.severity),
        firstDetected: baselineDate,
        lastObserved: baselineDate,
        advisoryId: advisory.id || null,
        advisoryUrl: advisory.url || null,
        vulnerableVersions: advisory.vulnerable_versions || null,
        patchedVersions: advisory.patched_versions || null,
        recommendation: advisory.recommendation || null,
        cves: advisory.cves || [],
        cwe: advisory.cwe || [],
        cvss: advisory.cvss || null,
        paths: sourcePaths,
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
  collectPathsFromFinding,
  createScaBaseline,
  createScaBaselines,
  parseJsonLines,
};
