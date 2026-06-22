#!/usr/bin/env node

/* eslint-disable no-console */

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { parseArgs } = require('node:util');

const DEFAULT_SCAN_TYPES_PATH = 'security/findings/scan-types.json';
const DEFAULT_REGISTER_PATH = 'security/findings/register.json';
const DEFAULT_SAST_BASELINE_PATH = 'security/sast/baseline.json';
const DEFAULT_SAST_DISPOSITIONS_PATH = 'security/sast/dispositions.json';
const DEFAULT_BACKEND_AUDIT_PATH = 'yarn-audit-known-issues';
const DEFAULT_FRONTEND_AUDIT_PATH = 'frontend/yarn-audit-known-issues';
const DEFAULT_BACKEND_BASELINE_PATH = 'security/dependencies/backend-baseline.json';
const DEFAULT_FRONTEND_BASELINE_PATH = 'security/dependencies/frontend-baseline.json';
const DEFAULT_PENDING_OBSERVATIONS_PATH = 'security/dependencies/pending-observations.json';

const VALID_REGISTER_SEVERITIES = new Set(['info', 'low', 'moderate', 'high', 'critical']);
const VALID_SCAN_TYPES = new Set(['sast', 'sca', 'dast']);
const VALID_DISPOSITIONS = new Set(['resolved', 'accepted', 'deferred']);
const VALID_ACCEPTANCE_TYPES = new Set(['risk_accepted', 'false_positive', 'not_applicable']);
const VALID_PENDING_ESCALATION_STATES = new Set(['warning', 'escalated', 'resolved']);
const OPERATIONAL_TIME_ZONE = 'America/New_York';
const DUE_DATE_WARNING_DAYS = 14;
const DUE_DATE_GRACE_DAYS = 7;
const JIRA_TICKET_PATTERN = /^TTAHUB-[1-9]\d*$/;

function resolveProjectPath(relativePath, cwd = process.cwd()) {
  return path.resolve(cwd, relativePath);
}

function pathExists(filePath) {
  return fs.existsSync(filePath);
}

function readJson(jsonPath) {
  return JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
}

function writeJson(jsonPath, data, { flag = 'w' } = {}) {
  fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
  fs.writeFileSync(jsonPath, `${JSON.stringify(data, null, 2)}\n`, {
    encoding: 'utf8',
    flag,
  });
}

function toGitPath(projectPath) {
  return projectPath.split(path.sep).join('/');
}

function validateGitRevision(revision) {
  if (
    typeof revision !== 'string' ||
    !revision ||
    revision.startsWith('-') ||
    /[\s:\0]/.test(revision) ||
    revision.includes('..') ||
    revision.includes('@{')
  ) {
    throw new Error(`Invalid --previous-pending-ref ${JSON.stringify(revision)}`);
  }

  return revision;
}

function isMissingGitObjectError(stderr) {
  return (
    stderr.includes('exists on disk, but not in') ||
    stderr.includes('invalid object name') ||
    stderr.includes('unknown revision or path not in the working tree') ||
    stderr.includes('bad revision') ||
    stderr.includes('Needed a single revision') ||
    (stderr.includes('path') && stderr.includes('does not exist'))
  );
}

function assertRegisterCanBeSeeded({ registerPath, overwrite = false, cwd = process.cwd() }) {
  const resolvedRegisterPath = resolveProjectPath(registerPath, cwd);
  if (pathExists(resolvedRegisterPath) && !overwrite) {
    throw registerOverwriteError(registerPath);
  }
}

function registerOverwriteError(registerPath) {
  return new Error(
    `Refusing to overwrite existing register ${registerPath}; pass --force only for an intentional full regeneration`
  );
}

function isNormalizedJiraTicket(ticket) {
  return typeof ticket === 'string' && ticket === ticket.trim() && JIRA_TICKET_PATTERN.test(ticket);
}

function normalizeJiraTicket(ticket, { required = false } = {}) {
  if (ticket === null || ticket === undefined) {
    if (!required) {
      return null;
    }
    throw new Error('seed-register requires --ticket in TTAHUB-1234 format');
  }

  const normalizedTicket = typeof ticket === 'string' ? ticket.trim() : '';
  if (!isNormalizedJiraTicket(normalizedTicket)) {
    throw new Error('seed-register requires --ticket in TTAHUB-1234 format');
  }

  return normalizedTicket;
}

function squashWhitespace(value = '') {
  return value.replace(/\s+/g, ' ').trim();
}

function validateArray(value, label) {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array`);
  }

  return value;
}

function validateObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }

  return value;
}

function validateIsoDate(value, label) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${label} must be an ISO date in YYYY-MM-DD format`);
  }

  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new Error(`${label} must be a valid ISO date`);
  }

  return value;
}

function operationalDate(value = new Date(), timeZone = OPERATIONAL_TIME_ZONE) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date value ${value}`);
  }

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return `${values.year}-${values.month}-${values.day}`;
}

function sanitizeIdComponent(value) {
  return String(value).replace(/[^A-Za-z0-9._-]+/g, '-');
}

function compareDates(left, right) {
  return left.localeCompare(right);
}

function buildSastFindingId(signature) {
  return `SAST-SEMGRP-${signature}`;
}

function buildScaFindingId(scope, advisoryId, moduleName, affectedVersion) {
  return [
    'SCA',
    scope.toUpperCase(),
    sanitizeIdComponent(advisoryId),
    sanitizeIdComponent(moduleName),
    sanitizeIdComponent(affectedVersion),
  ].join('-');
}

function parseOperationalDate(dateValue) {
  validateIsoDate(dateValue, 'dateValue');
  return new Date(`${dateValue}T00:00:00Z`);
}

function businessDaysSince(firstSeen, observedOn) {
  if (compareDates(firstSeen, observedOn) > 0) {
    throw new Error(`firstSeen ${firstSeen} cannot be after observedOn ${observedOn}`);
  }

  const current = parseOperationalDate(firstSeen);
  const end = parseOperationalDate(observedOn);

  current.setUTCDate(current.getUTCDate() + 1);

  let count = 0;

  while (current <= end) {
    const weekday = current.getUTCDay();
    if (weekday !== 0 && weekday !== 6) {
      count += 1;
    }
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return count;
}

function calendarDaysBetween(startDate, endDate) {
  const start = parseOperationalDate(startDate);
  const end = parseOperationalDate(endDate);
  return Math.round((end.getTime() - start.getTime()) / 86_400_000);
}

function loadScanTypes(scanTypesPath = DEFAULT_SCAN_TYPES_PATH, cwd = process.cwd()) {
  const resolvedPath = resolveProjectPath(scanTypesPath, cwd);
  const scanTypes = readJson(resolvedPath);
  validateScanTypes(scanTypes);
  return scanTypes;
}

function validateScanTypes(scanTypes) {
  validateObject(scanTypes, 'scanTypes');
  validateObject(scanTypes.scanners, 'scanTypes.scanners');

  Object.entries(scanTypes.scanners).forEach(([scannerName, scannerConfig]) => {
    validateObject(scannerConfig, `scanTypes.scanners.${scannerName}`);
    if (!VALID_SCAN_TYPES.has(scannerConfig.scanType)) {
      throw new Error(
        `scanTypes.scanners.${scannerName}.scanType must be one of ${[...VALID_SCAN_TYPES].join(
          ', '
        )}`
      );
    }

    validateObject(scannerConfig.severityMap, `scanTypes.scanners.${scannerName}.severityMap`);
    Object.entries(scannerConfig.severityMap).forEach(([sourceSeverity, mappedSeverity]) => {
      if (!sourceSeverity) {
        throw new Error(`scanTypes.scanners.${scannerName}.severityMap contains an empty key`);
      }
      if (!VALID_REGISTER_SEVERITIES.has(mappedSeverity)) {
        throw new Error(
          `scanTypes.scanners.${scannerName}.severityMap.${sourceSeverity} must map to a valid register severity`
        );
      }
    });
  });
}

function mapSeverity(scanTypes, scannerName, sourceSeverity) {
  const scannerConfig = scanTypes.scanners?.[scannerName];
  if (!scannerConfig) {
    throw new Error(`Unknown scanner ${scannerName}`);
  }

  const mappedSeverity = scannerConfig.severityMap?.[sourceSeverity];
  if (!mappedSeverity) {
    throw new Error(`No severity mapping for ${scannerName}:${sourceSeverity}`);
  }

  return mappedSeverity;
}

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

function mapLegacySemgrepDisposition(status) {
  switch (status) {
    case 'accepted_risk':
      return { disposition: 'accepted', acceptanceType: 'risk_accepted' };
    case 'false_positive':
      return { disposition: 'accepted', acceptanceType: 'false_positive' };
    case 'not_applicable':
      return { disposition: 'accepted', acceptanceType: 'not_applicable' };
    case 'fixed':
      return { disposition: 'resolved' };
    case 'deferred':
      return { disposition: 'deferred' };
    default:
      throw new Error(`Unsupported Semgrep disposition status ${status}`);
  }
}

function buildApprovalEvidenceFromLegacyDisposition(disposition) {
  if (disposition?.approvalEvidence) {
    return disposition.approvalEvidence;
  }

  return null;
}

function getApprovalEvidenceIssues(entryId, approvalEvidence) {
  const issues = [];
  if (!approvalEvidence) {
    return [`${entryId} approvalEvidence is missing`];
  }

  try {
    validateObject(approvalEvidence, `${entryId}.approvalEvidence`);
  } catch (error) {
    return [error.message];
  }

  const requiredKeys = [
    'system',
    'reference',
    'url',
    'approverName',
    'approverRole',
    'approvedOn',
    'decision',
  ];

  requiredKeys.forEach((key) => {
    if (!approvalEvidence[key]) {
      issues.push(`${entryId} approvalEvidence is missing ${key}`);
    }
  });

  if (approvalEvidence.approvedOn) {
    try {
      validateIsoDate(approvalEvidence.approvedOn, `${entryId}.approvalEvidence.approvedOn`);
    } catch (error) {
      issues.push(error.message);
    }
  }

  return issues;
}

function collectMigrationGaps(entry) {
  const gaps = [];
  if (!entry.justification) {
    gaps.push('missing-justification');
  }
  if (!entry.owner) {
    gaps.push('missing-owner');
  }
  if (!entry.ticket) {
    gaps.push('missing-ticket');
  }
  if (entry.disposition === 'deferred' && !entry.closureTarget) {
    gaps.push('missing-closure-target');
  }
  if (entry.disposition === 'accepted' && !entry.reviewBy) {
    gaps.push('missing-review-by');
  }
  if (entry.disposition === 'accepted' && !entry.acceptanceType) {
    gaps.push('missing-acceptance-type');
  }
  if (entry.disposition === 'resolved' && !entry.resolvedOn) {
    gaps.push('missing-resolved-on');
  }
  if (entry.disposition === 'resolved' && !entry.resolutionEvidence) {
    gaps.push('missing-resolution-evidence');
  }
  getApprovalEvidenceIssues(entry.id, entry.approvalEvidence).forEach((issue) => {
    if (issue === `${entry.id} approvalEvidence is missing`) {
      gaps.push('missing-approval-evidence');
      return;
    }

    if (issue.includes('approvalEvidence is missing ')) {
      gaps.push(
        `missing-approval-evidence-${issue
          .split('approvalEvidence is missing ')[1]
          .replace(/\s+/g, '-')}`
      );
      return;
    }

    gaps.push(issue);
  });
  return gaps;
}

function isIncompleteMigrationEntry(entry) {
  return entry.migration?.complete === false;
}

function buildSastRegisterEntries({
  baselinePath = DEFAULT_SAST_BASELINE_PATH,
  dispositionsPath = DEFAULT_SAST_DISPOSITIONS_PATH,
  scanTypesPath = DEFAULT_SCAN_TYPES_PATH,
  cwd = process.cwd(),
} = {}) {
  const scanTypes = loadScanTypes(scanTypesPath, cwd);
  const baseline = readJson(resolveProjectPath(baselinePath, cwd));
  const dispositions = readJson(resolveProjectPath(dispositionsPath, cwd));
  const baselineFindings = validateArray(baseline.findings, 'baseline.findings');
  const dispositionItems = validateArray(dispositions.items, 'dispositions.items');
  const dispositionsBySignature = new Map(
    dispositionItems.map((disposition) => [disposition.signature, disposition])
  );

  return baselineFindings.map((finding) => {
    const legacyDisposition = dispositionsBySignature.get(finding.signature) || null;
    const mappedDisposition = legacyDisposition
      ? mapLegacySemgrepDisposition(legacyDisposition.status)
      : { disposition: 'deferred' };
    const entry = {
      id: buildSastFindingId(finding.signature),
      scanType: 'sast',
      scanner: 'semgrep',
      scope: 'application',
      scannerFindingId: finding.checkId,
      title: squashWhitespace(finding.message),
      severity: mapSeverity(scanTypes, 'semgrep', finding.severity),
      sourceSeverity: finding.severity,
      firstDetected: baseline.baselineDate,
      lastObserved: baseline.baselineDate,
      disposition: mappedDisposition.disposition,
      justification: legacyDisposition?.rationale || null,
      owner: legacyDisposition?.owner || null,
      ticket: legacyDisposition?.ticket || null,
      source: {
        signature: finding.signature,
        findingOccurrence: finding.findingOccurrence,
        path: finding.path,
        start: finding.start,
        end: finding.end,
        snippet: finding.snippet,
        metadata: finding.metadata,
      },
      legacyDisposition: legacyDisposition
        ? {
            status: legacyDisposition.status,
            reviewBy: legacyDisposition.reviewBy || null,
            approvedBy: legacyDisposition.approvedBy || null,
            approvedOn: legacyDisposition.approvedOn || null,
          }
        : null,
    };

    if (mappedDisposition.acceptanceType) {
      entry.acceptanceType = mappedDisposition.acceptanceType;
      entry.reviewBy = legacyDisposition?.reviewBy || null;
    }

    if (mappedDisposition.disposition === 'deferred') {
      entry.closureTarget = legacyDisposition?.reviewBy || null;
    }

    if (mappedDisposition.disposition === 'resolved') {
      entry.resolvedOn = legacyDisposition?.approvedOn || null;
      entry.resolutionEvidence = legacyDisposition?.ticket || null;
    }

    const approvalEvidence = buildApprovalEvidenceFromLegacyDisposition(legacyDisposition);
    if (approvalEvidence) {
      entry.approvalEvidence = approvalEvidence;
    }

    entry.migration = {
      seededFrom: 'security/sast/baseline.json + security/sast/dispositions.json',
      complete: false,
      gaps: collectMigrationGaps(entry),
    };
    entry.migration.complete = entry.migration.gaps.length === 0;

    return entry;
  });
}

function buildScaRegisterEntries({
  backendBaselinePath = DEFAULT_BACKEND_BASELINE_PATH,
  frontendBaselinePath = DEFAULT_FRONTEND_BASELINE_PATH,
  owner = 'TTA Hub AppDev',
  ticket = null,
  closureTarget = null,
  justification = 'Migrated from the legacy Yarn Audit active exception set. Technical assessment and approval evidence still need to be added.',
  cwd = process.cwd(),
} = {}) {
  const baselines = [
    readJson(resolveProjectPath(backendBaselinePath, cwd)),
    readJson(resolveProjectPath(frontendBaselinePath, cwd)),
  ];

  return baselines.flatMap((baseline) =>
    validateArray(baseline.findings, `${baseline.scope}.findings`).map((finding) => {
      const entry = {
        id: finding.id,
        scanType: 'sca',
        scanner: 'yarn-audit',
        scope: baseline.scope,
        scannerFindingId: finding.scannerFindingId,
        title: squashWhitespace(finding.title),
        severity: finding.severity,
        sourceSeverity: finding.sourceSeverity,
        firstDetected: finding.firstDetected,
        lastObserved: finding.lastObserved,
        disposition: 'deferred',
        justification,
        owner,
        ticket,
        source: {
          module: finding.module,
          affectedVersion: finding.affectedVersion,
          advisoryId: finding.advisoryId,
          advisoryUrl: finding.advisoryUrl,
          vulnerableVersions: finding.vulnerableVersions,
          patchedVersions: finding.patchedVersions,
          recommendation: finding.recommendation,
          cves: finding.cves,
          cwe: finding.cwe,
          cvss: finding.cvss,
          paths: finding.paths,
        },
      };

      if (closureTarget) {
        entry.closureTarget = closureTarget;
      }

      entry.migration = {
        seededFrom: baseline.scanner?.sourceFile || 'yarn-audit-known-issues',
        complete: false,
        gaps: collectMigrationGaps(entry),
      };
      entry.migration.complete = entry.migration.gaps.length === 0;

      return entry;
    })
  );
}

function sortRegisterEntries(entries) {
  return [...entries].sort((left, right) => left.id.localeCompare(right.id));
}

function summarizeRegister(entries) {
  return entries.reduce(
    (summary, entry) => {
      summary.total += 1;
      summary.byScanType[entry.scanType] = (summary.byScanType[entry.scanType] || 0) + 1;
      if (entry.migration?.complete === false) {
        summary.incomplete += 1;
      }
      return summary;
    },
    {
      total: 0,
      incomplete: 0,
      byScanType: {},
    }
  );
}

function createRegister({
  registerPath = DEFAULT_REGISTER_PATH,
  scanTypesPath = DEFAULT_SCAN_TYPES_PATH,
  sastBaselinePath = DEFAULT_SAST_BASELINE_PATH,
  sastDispositionsPath = DEFAULT_SAST_DISPOSITIONS_PATH,
  backendBaselinePath = DEFAULT_BACKEND_BASELINE_PATH,
  frontendBaselinePath = DEFAULT_FRONTEND_BASELINE_PATH,
  owner = 'TTA Hub AppDev',
  ticket = null,
  closureTarget = null,
  generatedAt = new Date().toISOString(),
  overwrite = false,
  cwd = process.cwd(),
} = {}) {
  const normalizedTicket = normalizeJiraTicket(ticket);
  assertRegisterCanBeSeeded({ registerPath, overwrite, cwd });
  loadScanTypes(scanTypesPath, cwd);

  const entries = sortRegisterEntries([
    ...buildSastRegisterEntries({
      baselinePath: sastBaselinePath,
      dispositionsPath: sastDispositionsPath,
      scanTypesPath,
      cwd,
    }),
    ...buildScaRegisterEntries({
      backendBaselinePath,
      frontendBaselinePath,
      owner,
      ticket: normalizedTicket,
      closureTarget,
      cwd,
    }),
  ]);

  const register = {
    version: 1,
    generatedAt,
    summary: summarizeRegister(entries),
    items: Object.fromEntries(entries.map((entry) => [entry.id, entry])),
  };

  try {
    writeJson(resolveProjectPath(registerPath, cwd), register, {
      flag: overwrite ? 'w' : 'wx',
    });
  } catch (error) {
    if (!overwrite && error.code === 'EEXIST') {
      throw registerOverwriteError(registerPath);
    }
    throw error;
  }
  return register;
}

function validateApprovalEvidence(entry, issues, { strict = false } = {}) {
  const approvalIssues = getApprovalEvidenceIssues(entry.id, entry.approvalEvidence).filter(
    (issue) => issue !== `${entry.id} approvalEvidence is missing`
  );
  if (!strict && isIncompleteMigrationEntry(entry)) {
    return;
  }

  approvalIssues.forEach((issue) => issues.push(issue));
}

function arraysMatch(left = [], right = []) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function validateSastBaselineEvidence({
  baselinePath = DEFAULT_SAST_BASELINE_PATH,
  scanConfigPath = 'security/sast/scan-config.json',
  cwd = process.cwd(),
} = {}) {
  const baseline = readJson(resolveProjectPath(baselinePath, cwd));
  const findings = validateArray(baseline.findings, 'sast baseline.findings').map((finding) => ({
    id: buildSastFindingId(finding.signature),
    scannerFindingId: finding.checkId,
    sourceSeverity: finding.severity,
  }));
  const errors = [];
  const warnings = [];

  if (!baseline.baselineDate) {
    errors.push(`${baselinePath} is missing baselineDate`);
  } else {
    try {
      validateIsoDate(baseline.baselineDate, `${baselinePath}.baselineDate`);
    } catch (error) {
      errors.push(error.message);
    }
  }

  if (baseline.scanCompleteness && baseline.scanCompleteness.isComplete === false) {
    errors.push(`${baselinePath} records an incomplete Semgrep baseline scan`);
  }

  if (!baseline.scanCompleteness) {
    errors.push(`${baselinePath} does not record scan completeness metadata`);
  } else if (typeof baseline.scanCompleteness.isComplete !== 'boolean') {
    errors.push(`${baselinePath} scanCompleteness.isComplete must be a boolean`);
  }

  if (!baseline.scanner) {
    errors.push(`${baselinePath} does not record Semgrep scanner metadata`);
    return {
      errors,
      warnings,
      findings,
    };
  }

  const scanConfig = readJson(resolveProjectPath(scanConfigPath, cwd));
  const driftChecks = [
    ['version', baseline.scanner.version, scanConfig.semgrepVersion],
    ['configs', baseline.scanner.configs, scanConfig.configs],
    ['include', baseline.scanner.include, scanConfig.include],
    ['exclude', baseline.scanner.exclude, scanConfig.exclude],
    ['timeoutSeconds', baseline.scanner.timeoutSeconds, scanConfig.timeoutSeconds],
    ['timeoutThreshold', baseline.scanner.timeoutThreshold, scanConfig.timeoutThreshold],
    ['blockingSeverities', baseline.scanner.blockingSeverities, scanConfig.blockingSeverities],
  ];

  driftChecks.forEach(([field, baselineValue, configValue]) => {
    const matches =
      Array.isArray(baselineValue) || Array.isArray(configValue)
        ? arraysMatch(baselineValue, configValue)
        : baselineValue === configValue;

    if (!matches) {
      warnings.push(
        `${baselinePath} Semgrep ${field} differs from ${scanConfigPath}; refresh the baseline or document the config change`
      );
    }
  });

  return {
    errors,
    warnings,
    findings,
  };
}

function validateScaBaselineEvidence({ baselinePath, expectedScope, cwd = process.cwd() } = {}) {
  const baseline = readJson(resolveProjectPath(baselinePath, cwd));
  const errors = [];
  const warnings = [];

  if (baseline.scope !== expectedScope) {
    errors.push(`${baselinePath} scope must be ${expectedScope}`);
  }

  if (baseline.scanner?.name !== 'yarn-audit') {
    errors.push(`${baselinePath} scanner.name must be yarn-audit`);
  }

  if (!baseline.baselineDate) {
    errors.push(`${baselinePath} is missing baselineDate`);
  } else {
    try {
      validateIsoDate(baseline.baselineDate, `${baselinePath}.baselineDate`);
    } catch (error) {
      errors.push(error.message);
    }
  }

  const findings = validateArray(baseline.findings, `${baselinePath}.findings`).map((finding) => {
    if (!finding.id) {
      errors.push(`${baselinePath} has an SCA finding without id`);
    }

    return {
      id: finding.id,
      scannerFindingId: finding.scannerFindingId,
      sourceSeverity: finding.sourceSeverity,
    };
  });

  if (!baseline.scanner?.sourceFile) {
    warnings.push(`${baselinePath} does not record the Yarn Audit source file`);
  }

  return {
    errors,
    warnings,
    findings,
  };
}

function reconcileCurrentFindings({ register, findings, scanType, errors, warnings }) {
  const currentIds = new Set(findings.map((finding) => finding.id));

  findings.forEach((finding) => {
    const entry = register.items[finding.id];
    if (!entry) {
      errors.push(
        `Current ${scanType.toUpperCase()} finding is missing from the register: ${finding.id}`
      );
      return;
    }

    if (entry.disposition === 'resolved') {
      errors.push(`Current ${scanType.toUpperCase()} finding is marked resolved: ${finding.id}`);
    }

    if (entry.scannerFindingId !== finding.scannerFindingId) {
      errors.push(
        `Current ${scanType.toUpperCase()} finding scannerFindingId differs from the register for ${finding.id}: expected ${finding.scannerFindingId}, found ${entry.scannerFindingId}`
      );
    }

    if (entry.sourceSeverity !== finding.sourceSeverity) {
      errors.push(
        `Current ${scanType.toUpperCase()} finding sourceSeverity differs from the register for ${finding.id}: expected ${finding.sourceSeverity}, found ${entry.sourceSeverity}`
      );
    }
  });

  Object.values(register.items)
    .filter((entry) => entry.scanType === scanType && entry.disposition !== 'resolved')
    .filter((entry) => !currentIds.has(entry.id))
    .forEach((entry) => {
      warnings.push(
        `${entry.scanType.toUpperCase()} register entry is absent from current baseline and should be reviewed for resolution: ${entry.id}`
      );
    });
}

function enforceDispositionDeadlines({ register, observedOn, errors, warnings }) {
  Object.values(register.items).forEach((entry) => {
    const dueField =
      entry.disposition === 'deferred'
        ? 'closureTarget'
        : entry.disposition === 'accepted'
          ? 'reviewBy'
          : null;

    if (!dueField || !entry[dueField]) {
      return;
    }

    try {
      validateIsoDate(entry[dueField], `${entry.id}.${dueField}`);
    } catch (error) {
      errors.push(error.message);
      return;
    }

    const daysUntilDue = calendarDaysBetween(observedOn, entry[dueField]);
    if (daysUntilDue >= 0 && daysUntilDue <= DUE_DATE_WARNING_DAYS) {
      warnings.push(`${entry.id} ${dueField} is due in ${daysUntilDue} calendar days`);
      return;
    }

    if (daysUntilDue < 0) {
      const overdueDays = calendarDaysBetween(entry[dueField], observedOn);
      if (overdueDays > DUE_DATE_GRACE_DAYS) {
        errors.push(
          `${entry.id} ${dueField} is ${overdueDays} calendar days overdue, exceeding the ${DUE_DATE_GRACE_DAYS}-day grace period`
        );
        return;
      }

      warnings.push(
        `${entry.id} ${dueField} is ${overdueDays} calendar days overdue and within the ${DUE_DATE_GRACE_DAYS}-day grace period`
      );
    }
  });
}

function reconcileRegisterWithCurrentEvidence({
  register,
  sastBaselinePath = DEFAULT_SAST_BASELINE_PATH,
  sastScanConfigPath = 'security/sast/scan-config.json',
  backendBaselinePath = DEFAULT_BACKEND_BASELINE_PATH,
  frontendBaselinePath = DEFAULT_FRONTEND_BASELINE_PATH,
  cwd = process.cwd(),
} = {}) {
  const errors = [];
  const warnings = [];

  const sastEvidence = validateSastBaselineEvidence({
    baselinePath: sastBaselinePath,
    scanConfigPath: sastScanConfigPath,
    cwd,
  });
  errors.push(...sastEvidence.errors);
  warnings.push(...sastEvidence.warnings);
  reconcileCurrentFindings({
    register,
    findings: sastEvidence.findings,
    scanType: 'sast',
    errors,
    warnings,
  });

  const scaEvidence = [
    validateScaBaselineEvidence({
      baselinePath: backendBaselinePath,
      expectedScope: 'backend',
      cwd,
    }),
    validateScaBaselineEvidence({
      baselinePath: frontendBaselinePath,
      expectedScope: 'frontend',
      cwd,
    }),
  ];
  scaEvidence.forEach((evidence) => {
    errors.push(...evidence.errors);
    warnings.push(...evidence.warnings);
  });
  reconcileCurrentFindings({
    register,
    findings: scaEvidence.flatMap((evidence) => evidence.findings),
    scanType: 'sca',
    errors,
    warnings,
  });

  return {
    errors,
    warnings,
  };
}

function validateRegister({
  registerPath = DEFAULT_REGISTER_PATH,
  scanTypesPath = DEFAULT_SCAN_TYPES_PATH,
  sastBaselinePath = DEFAULT_SAST_BASELINE_PATH,
  sastScanConfigPath = 'security/sast/scan-config.json',
  backendBaselinePath = DEFAULT_BACKEND_BASELINE_PATH,
  frontendBaselinePath = DEFAULT_FRONTEND_BASELINE_PATH,
  observedOn = operationalDate(),
  strict = false,
  cwd = process.cwd(),
} = {}) {
  const scanTypes = loadScanTypes(scanTypesPath, cwd);
  const register = readJson(resolveProjectPath(registerPath, cwd));
  validateObject(register, 'register');
  validateObject(register.items, 'register.items');

  const errors = [];
  const warnings = [];
  const seenIds = new Set();

  Object.entries(register.items).forEach(([key, entry]) => {
    try {
      validateObject(entry, `register.items.${key}`);
    } catch (error) {
      errors.push(error.message);
      return;
    }

    if (seenIds.has(entry.id)) {
      errors.push(`Duplicate register entry id ${entry.id}`);
    }
    seenIds.add(entry.id);

    if (key !== entry.id) {
      errors.push(`Register key ${key} does not match nested id ${entry.id}`);
    }

    const requiredFields = [
      'id',
      'scanType',
      'scanner',
      'scope',
      'scannerFindingId',
      'title',
      'severity',
      'sourceSeverity',
      'firstDetected',
      'lastObserved',
      'disposition',
      'justification',
      'owner',
      'ticket',
    ];

    requiredFields.forEach((field) => {
      if (!entry[field]) {
        errors.push(`${entry.id} is missing required field ${field}`);
      }
    });

    if (entry.ticket && !isNormalizedJiraTicket(entry.ticket)) {
      errors.push(`${entry.id}.ticket must be a JIRA key in TTAHUB-1234 format`);
    }

    if (!VALID_SCAN_TYPES.has(entry.scanType)) {
      errors.push(`${entry.id} has invalid scanType ${entry.scanType}`);
    }

    if (!VALID_REGISTER_SEVERITIES.has(entry.severity)) {
      errors.push(`${entry.id} has invalid severity ${entry.severity}`);
    }

    if (!VALID_DISPOSITIONS.has(entry.disposition)) {
      errors.push(`${entry.id} has invalid disposition ${entry.disposition}`);
    }

    try {
      const mappedSeverity = mapSeverity(scanTypes, entry.scanner, entry.sourceSeverity);
      if (mappedSeverity !== entry.severity) {
        errors.push(
          `${entry.id} severity ${entry.severity} does not match ${entry.scanner}:${entry.sourceSeverity} => ${mappedSeverity}`
        );
      }
    } catch (error) {
      errors.push(`${entry.id} has unmapped severity ${entry.scanner}:${entry.sourceSeverity}`);
    }

    try {
      validateIsoDate(entry.firstDetected, `${entry.id}.firstDetected`);
      validateIsoDate(entry.lastObserved, `${entry.id}.lastObserved`);
      if (compareDates(entry.firstDetected, entry.lastObserved) > 0) {
        errors.push(`${entry.id} firstDetected cannot be after lastObserved`);
      }
    } catch (error) {
      errors.push(error.message);
    }

    if (entry.disposition === 'accepted' && entry.acceptanceType) {
      if (!VALID_ACCEPTANCE_TYPES.has(entry.acceptanceType)) {
        errors.push(`${entry.id} has invalid acceptanceType ${entry.acceptanceType}`);
      }
    }

    validateApprovalEvidence(entry, errors, { strict });

    const migrationGaps = collectMigrationGaps(entry);
    migrationGaps.forEach((gap) => {
      const message = `${entry.id} ${gap.replace(/-/g, ' ')}`;
      if (strict || !isIncompleteMigrationEntry(entry)) {
        errors.push(message);
      } else {
        warnings.push(message);
      }
    });
  });

  const reconciliation = reconcileRegisterWithCurrentEvidence({
    register,
    sastBaselinePath,
    sastScanConfigPath,
    backendBaselinePath,
    frontendBaselinePath,
    cwd,
  });
  errors.push(...reconciliation.errors);
  warnings.push(...reconciliation.warnings);
  enforceDispositionDeadlines({
    register,
    observedOn,
    errors,
    warnings,
  });

  return {
    errors,
    warnings,
    register,
  };
}

function createEmptyPendingObservationsStore() {
  return {
    items: {},
  };
}

function validatePendingObservationsStore(store, label) {
  validateObject(store, label);
  validateObject(store.items, `${label}.items`);
  return store;
}

function loadPendingObservationsStore(pendingPath, cwd = process.cwd()) {
  const resolvedPath = resolveProjectPath(pendingPath, cwd);
  if (!pathExists(resolvedPath)) {
    return createEmptyPendingObservationsStore();
  }

  return validatePendingObservationsStore(readJson(resolvedPath), 'pendingObservations');
}

function loadPendingObservationsStoreFromGitRef({
  pendingPath,
  pendingRef,
  cwd = process.cwd(),
} = {}) {
  const gitPath = toGitPath(pendingPath);
  const revision = validateGitRevision(pendingRef);
  let commit;
  let contents;

  try {
    commit = execFileSync(
      'git',
      ['rev-parse', '--verify', '--end-of-options', `${revision}^{commit}`],
      {
        cwd,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      }
    ).trim();
  } catch (error) {
    const stderr = String(error.stderr || '');
    if (isMissingGitObjectError(stderr)) {
      return null;
    }
    throw new Error(
      `Unable to resolve trusted pending observations ref ${revision}: ${stderr.trim() || error.message}`
    );
  }

  try {
    contents = execFileSync('git', ['show', '--end-of-options', `${commit}:${gitPath}`], {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (error) {
    const stderr = String(error.stderr || '');
    if (isMissingGitObjectError(stderr)) {
      return null;
    }
    throw new Error(
      `Unable to load trusted pending observations from ${revision}:${gitPath}: ${stderr.trim() || error.message}`
    );
  }

  return validatePendingObservationsStore(JSON.parse(contents), `pendingObservations@${revision}`);
}

function loadTrustedPendingObservationsStore({
  pendingPath = DEFAULT_PENDING_OBSERVATIONS_PATH,
  previousPendingPath = null,
  previousPendingRef = null,
  cwd = process.cwd(),
} = {}) {
  if (previousPendingPath) {
    const resolvedPath = resolveProjectPath(previousPendingPath, cwd);
    if (!pathExists(resolvedPath)) {
      return null;
    }

    return validatePendingObservationsStore(
      readJson(resolvedPath),
      `pendingObservations@${previousPendingPath}`
    );
  }

  if (previousPendingRef) {
    return loadPendingObservationsStoreFromGitRef({
      pendingPath,
      pendingRef: previousPendingRef,
      cwd,
    });
  }

  return null;
}

function validatePendingObservations({
  pendingPath = DEFAULT_PENDING_OBSERVATIONS_PATH,
  previousPendingPath = null,
  previousPendingRef = null,
  scanTypesPath = DEFAULT_SCAN_TYPES_PATH,
  registerPath = DEFAULT_REGISTER_PATH,
  backendAuditPath = DEFAULT_BACKEND_AUDIT_PATH,
  frontendAuditPath = DEFAULT_FRONTEND_AUDIT_PATH,
  observedOn = operationalDate(),
  reconcile = true,
  cwd = process.cwd(),
} = {}) {
  const scanTypes = loadScanTypes(scanTypesPath, cwd);
  const store = loadPendingObservationsStore(pendingPath, cwd);
  let trustedPreviousStore = null;
  const errors = [];
  const seenIds = new Set();

  try {
    trustedPreviousStore = loadTrustedPendingObservationsStore({
      pendingPath,
      previousPendingPath,
      previousPendingRef,
      cwd,
    });
  } catch (error) {
    errors.push(error.message);
  }

  Object.entries(store.items).forEach(([key, entry]) => {
    try {
      validateObject(entry, `pendingObservations.items.${key}`);
    } catch (error) {
      errors.push(error.message);
      return;
    }

    if (seenIds.has(entry.id)) {
      errors.push(`Duplicate pending observation id ${entry.id}`);
    }
    seenIds.add(entry.id);

    if (key !== entry.id) {
      errors.push(`Pending observation key ${key} does not match nested id ${entry.id}`);
    }

    const requiredFields = [
      'id',
      'scanType',
      'scanner',
      'scope',
      'scannerFindingId',
      'module',
      'affectedVersion',
      'sourceSeverity',
      'severity',
      'firstSeen',
      'lastObserved',
      'escalationState',
    ];
    requiredFields.forEach((field) => {
      if (!entry[field]) {
        errors.push(`${entry.id} is missing required field ${field}`);
      }
    });

    if (entry.scanType !== 'sca') {
      errors.push(`${entry.id} must have scanType=sca`);
    }
    if (entry.scanner !== 'yarn-audit') {
      errors.push(`${entry.id} must have scanner=yarn-audit`);
    }
    if (!['backend', 'frontend'].includes(entry.scope)) {
      errors.push(`${entry.id} must have scope backend or frontend`);
    }
    if (!VALID_PENDING_ESCALATION_STATES.has(entry.escalationState)) {
      errors.push(`${entry.id} has invalid escalationState ${entry.escalationState}`);
    }

    try {
      const mappedSeverity = mapSeverity(scanTypes, entry.scanner, entry.sourceSeverity);
      if (mappedSeverity !== entry.severity) {
        errors.push(
          `${entry.id} severity ${entry.severity} does not match ${entry.scanner}:${entry.sourceSeverity} => ${mappedSeverity}`
        );
      }
    } catch (error) {
      errors.push(`${entry.id} has unmapped severity ${entry.scanner}:${entry.sourceSeverity}`);
    }

    try {
      validateIsoDate(entry.firstSeen, `${entry.id}.firstSeen`);
      validateIsoDate(entry.lastObserved, `${entry.id}.lastObserved`);
      if (compareDates(entry.firstSeen, entry.lastObserved) > 0) {
        errors.push(`${entry.id} firstSeen cannot be after lastObserved`);
      }
    } catch (error) {
      errors.push(error.message);
    }
  });

  if (reconcile) {
    const register = readJson(resolveProjectPath(registerPath, cwd));
    const activeRegisterIds = getActiveScaRegisterIds(register);
    const currentUnregisteredFindings = collectCurrentScaFindings({
      backendAuditPath,
      frontendAuditPath,
      scanTypesPath,
      observedOn,
      cwd,
    }).filter((finding) => !activeRegisterIds.has(finding.id));
    const currentUnregisteredIds = new Set(
      currentUnregisteredFindings.map((finding) => finding.id)
    );
    const pendingIds = new Set(Object.keys(store.items));

    currentUnregisteredFindings.forEach((finding) => {
      const actual = store.items[finding.id];
      if (!actual) {
        errors.push(`Pending observations are missing current unregistered advisory ${finding.id}`);
        return;
      }

      try {
        const trustedPreviousEntry = trustedPreviousStore
          ? trustedPreviousStore.items[finding.id] || null
          : actual;
        const { entry: expected } = buildPendingObservationEntry({
          finding,
          previousEntry: trustedPreviousEntry,
          observedOn,
        });

        Object.entries(expected).forEach(([field, expectedValue]) => {
          if (actual[field] !== expectedValue) {
            errors.push(
              `Pending observation ${finding.id} ${field} does not match the current expected value: expected ${expectedValue}, found ${actual[field]}`
            );
          }
        });
      } catch (error) {
        errors.push(`Pending observation ${finding.id} cannot be reconciled: ${error.message}`);
      }
    });

    currentUnregisteredIds.forEach((id) => {
      if (!pendingIds.has(id)) {
        errors.push(`Pending observations are missing current unregistered advisory ${id}`);
      }
    });

    pendingIds.forEach((id) => {
      if (!currentUnregisteredIds.has(id)) {
        errors.push(
          `Pending observation ${id} is stale; remove it because it is not currently unregistered in live audit output`
        );
      }
    });
  }

  return {
    errors,
    store,
  };
}

function getActiveScaRegisterIds(register) {
  return new Set(
    Object.values(register.items)
      .filter((entry) => entry.scanType === 'sca' && entry.disposition !== 'resolved')
      .map((entry) => entry.id)
  );
}

function collectCurrentScaFindings({
  backendAuditPath = DEFAULT_BACKEND_AUDIT_PATH,
  frontendAuditPath = DEFAULT_FRONTEND_AUDIT_PATH,
  scanTypesPath = DEFAULT_SCAN_TYPES_PATH,
  observedOn = operationalDate(),
  cwd = process.cwd(),
} = {}) {
  const scanTypes = loadScanTypes(scanTypesPath, cwd);
  return [
    ...collectAuditAdvisoriesFromFile({
      auditPath: backendAuditPath,
      scope: 'backend',
      scanTypes,
      baselineDate: observedOn,
      cwd,
    }),
    ...collectAuditAdvisoriesFromFile({
      auditPath: frontendAuditPath,
      scope: 'frontend',
      scanTypes,
      baselineDate: observedOn,
      cwd,
    }),
  ];
}

function slaThresholdForSeverity(severity) {
  if (severity === 'critical' || severity === 'high') {
    return 5;
  }
  return 20;
}

function buildPendingObservationEntry({ finding, previousEntry = null, observedOn }) {
  const firstSeen = previousEntry?.firstSeen || observedOn;
  const elapsedBusinessDays = businessDaysSince(firstSeen, observedOn);
  const threshold = slaThresholdForSeverity(finding.severity);
  const escalated = elapsedBusinessDays > threshold;

  return {
    entry: {
      id: finding.id,
      scanType: 'sca',
      scanner: 'yarn-audit',
      scope: finding.scope,
      scannerFindingId: finding.scannerFindingId,
      module: finding.module,
      affectedVersion: finding.affectedVersion,
      sourceSeverity: finding.sourceSeverity,
      severity: finding.severity,
      firstSeen,
      lastObserved: observedOn,
      escalationState: escalated ? 'escalated' : 'warning',
    },
    threshold,
    escalated,
  };
}

function updatePendingObservations({
  registerPath = DEFAULT_REGISTER_PATH,
  pendingPath = DEFAULT_PENDING_OBSERVATIONS_PATH,
  previousPendingPath = null,
  previousPendingRef = null,
  scanTypesPath = DEFAULT_SCAN_TYPES_PATH,
  backendAuditPath = DEFAULT_BACKEND_AUDIT_PATH,
  frontendAuditPath = DEFAULT_FRONTEND_AUDIT_PATH,
  observedOn = operationalDate(),
  cwd = process.cwd(),
} = {}) {
  const register = readJson(resolveProjectPath(registerPath, cwd));
  const activeRegisterIds = getActiveScaRegisterIds(register);
  const existingStore = loadPendingObservationsStore(pendingPath, cwd);
  let trustedPreviousStore = null;

  try {
    trustedPreviousStore = loadTrustedPendingObservationsStore({
      pendingPath,
      previousPendingPath,
      previousPendingRef,
      cwd,
    });
  } catch (error) {
    return {
      store: existingStore,
      warnings: [],
      failures: [error.message],
    };
  }

  const currentFindings = collectCurrentScaFindings({
    backendAuditPath,
    frontendAuditPath,
    scanTypesPath,
    observedOn,
    cwd,
  });
  const currentUnregisteredFindings = currentFindings.filter(
    (finding) => !activeRegisterIds.has(finding.id)
  );

  const warnings = [];
  const failures = [];
  const nextItems = {};

  currentUnregisteredFindings.forEach((finding) => {
    const previousEntry = trustedPreviousStore
      ? trustedPreviousStore.items[finding.id] || null
      : existingStore.items[finding.id] || null;
    const { entry, threshold, escalated } = buildPendingObservationEntry({
      finding,
      previousEntry,
      observedOn,
    });

    nextItems[finding.id] = entry;

    if (!previousEntry) {
      warnings.push(`New undispositioned advisory observed: ${finding.id}`);
    }

    if (escalated) {
      failures.push(
        `${finding.id} exceeded the ${threshold}-business-day SLA for ${finding.severity} advisories`
      );
    }
  });

  const nextStore = {
    items: nextItems,
  };

  writeJson(resolveProjectPath(pendingPath, cwd), nextStore);

  return {
    store: nextStore,
    warnings,
    failures,
  };
}

function parseCliArguments(args = process.argv.slice(2)) {
  const { values, positionals } = parseArgs({
    args,
    allowPositionals: true,
    options: {
      'scan-types': { type: 'string' },
      register: { type: 'string' },
      'sast-baseline': { type: 'string' },
      'sast-dispositions': { type: 'string' },
      'sast-scan-config': { type: 'string' },
      'backend-audit': { type: 'string' },
      'frontend-audit': { type: 'string' },
      'backend-baseline': { type: 'string' },
      'frontend-baseline': { type: 'string' },
      pending: { type: 'string' },
      'previous-pending': { type: 'string' },
      'previous-pending-ref': { type: 'string' },
      owner: { type: 'string' },
      ticket: { type: 'string' },
      'closure-target': { type: 'string' },
      'generated-at': { type: 'string' },
      'observed-on': { type: 'string' },
      strict: { type: 'boolean' },
      force: { type: 'boolean' },
      help: { type: 'boolean', short: 'h' },
    },
  });

  return {
    command: positionals[0] || 'help',
    values,
  };
}

function printHelp() {
  console.log(`Usage:
  node tools/security-findings.js build-sca-baselines
  node tools/security-findings.js seed-register --ticket <JIRA-ticket> [--force]
  node tools/security-findings.js validate [--strict]
  node tools/security-findings.js sync-sca-pending

Options:
  -h, --help       Show this help
  --ticket <key>   TTAHUB JIRA key, such as TTAHUB-1234
  --force          Allow seed-register to overwrite an existing register`);
}

function printValidationSummary(result) {
  console.log(`Validation summary: ${Object.keys(result.register.items).length} register entries`);
  if (result.errors.length > 0) {
    console.error('Errors:');
    result.errors.forEach((error) => console.error(`- ${error}`));
  }
  if (result.warnings.length > 0) {
    console.warn('Warnings:');
    result.warnings.forEach((warning) => console.warn(`- ${warning}`));
  }
}

function main() {
  try {
    const { command, values } = parseCliArguments();
    if (values.help) {
      printHelp();
      return;
    }

    switch (command) {
      case 'build-sca-baselines': {
        const result = createScaBaselines({
          backendAuditPath: values['backend-audit'] || DEFAULT_BACKEND_AUDIT_PATH,
          frontendAuditPath: values['frontend-audit'] || DEFAULT_FRONTEND_AUDIT_PATH,
          backendBaselinePath: values['backend-baseline'] || DEFAULT_BACKEND_BASELINE_PATH,
          frontendBaselinePath: values['frontend-baseline'] || DEFAULT_FRONTEND_BASELINE_PATH,
          scanTypesPath: values['scan-types'] || DEFAULT_SCAN_TYPES_PATH,
          generatedAt: values['generated-at'] || new Date().toISOString(),
        });
        console.log(
          `SCA baselines written (${result.backend.findings.length} backend, ${result.frontend.findings.length} frontend findings)`
        );
        return;
      }
      case 'seed-register': {
        let ticket;
        try {
          ticket = normalizeJiraTicket(values.ticket, { required: true });
        } catch (error) {
          error.code = 'ERR_CLI_USAGE';
          throw error;
        }

        const registerPath = values.register || DEFAULT_REGISTER_PATH;
        assertRegisterCanBeSeeded({
          registerPath,
          overwrite: Boolean(values.force),
        });

        if (
          !pathExists(
            resolveProjectPath(values['backend-baseline'] || DEFAULT_BACKEND_BASELINE_PATH)
          ) ||
          !pathExists(
            resolveProjectPath(values['frontend-baseline'] || DEFAULT_FRONTEND_BASELINE_PATH)
          )
        ) {
          createScaBaselines({
            backendAuditPath: values['backend-audit'] || DEFAULT_BACKEND_AUDIT_PATH,
            frontendAuditPath: values['frontend-audit'] || DEFAULT_FRONTEND_AUDIT_PATH,
            backendBaselinePath: values['backend-baseline'] || DEFAULT_BACKEND_BASELINE_PATH,
            frontendBaselinePath: values['frontend-baseline'] || DEFAULT_FRONTEND_BASELINE_PATH,
            scanTypesPath: values['scan-types'] || DEFAULT_SCAN_TYPES_PATH,
            generatedAt: values['generated-at'] || new Date().toISOString(),
          });
        }

        const register = createRegister({
          registerPath,
          scanTypesPath: values['scan-types'] || DEFAULT_SCAN_TYPES_PATH,
          sastBaselinePath: values['sast-baseline'] || DEFAULT_SAST_BASELINE_PATH,
          sastDispositionsPath: values['sast-dispositions'] || DEFAULT_SAST_DISPOSITIONS_PATH,
          backendBaselinePath: values['backend-baseline'] || DEFAULT_BACKEND_BASELINE_PATH,
          frontendBaselinePath: values['frontend-baseline'] || DEFAULT_FRONTEND_BASELINE_PATH,
          owner: values.owner || 'TTA Hub AppDev',
          ticket,
          closureTarget: values['closure-target'] || null,
          generatedAt: values['generated-at'] || new Date().toISOString(),
          overwrite: Boolean(values.force),
        });
        console.log(
          `Register written with ${register.summary.total} entries (${register.summary.incomplete} incomplete migration entries)`
        );
        return;
      }
      case 'validate': {
        const result = validateRegister({
          registerPath: values.register || DEFAULT_REGISTER_PATH,
          scanTypesPath: values['scan-types'] || DEFAULT_SCAN_TYPES_PATH,
          sastBaselinePath: values['sast-baseline'] || DEFAULT_SAST_BASELINE_PATH,
          sastScanConfigPath: values['sast-scan-config'] || 'security/sast/scan-config.json',
          backendBaselinePath: values['backend-baseline'] || DEFAULT_BACKEND_BASELINE_PATH,
          frontendBaselinePath: values['frontend-baseline'] || DEFAULT_FRONTEND_BASELINE_PATH,
          observedOn: values['observed-on'] || operationalDate(),
          strict: Boolean(values.strict),
        });
        printValidationSummary(result);

        const pendingValidation = validatePendingObservations({
          pendingPath: values.pending || DEFAULT_PENDING_OBSERVATIONS_PATH,
          previousPendingPath: values['previous-pending'] || null,
          previousPendingRef: values['previous-pending-ref'] || null,
          scanTypesPath: values['scan-types'] || DEFAULT_SCAN_TYPES_PATH,
          registerPath: values.register || DEFAULT_REGISTER_PATH,
          backendAuditPath: values['backend-audit'] || DEFAULT_BACKEND_AUDIT_PATH,
          frontendAuditPath: values['frontend-audit'] || DEFAULT_FRONTEND_AUDIT_PATH,
          observedOn: values['observed-on'] || operationalDate(),
        });
        if (pendingValidation.errors.length > 0) {
          console.error('Pending observation errors:');
          pendingValidation.errors.forEach((error) => console.error(`- ${error}`));
        }

        if (result.errors.length > 0 || pendingValidation.errors.length > 0) {
          process.exit(1);
        }
        return;
      }
      case 'sync-sca-pending': {
        const result = updatePendingObservations({
          registerPath: values.register || DEFAULT_REGISTER_PATH,
          pendingPath: values.pending || DEFAULT_PENDING_OBSERVATIONS_PATH,
          previousPendingPath: values['previous-pending'] || null,
          previousPendingRef: values['previous-pending-ref'] || null,
          scanTypesPath: values['scan-types'] || DEFAULT_SCAN_TYPES_PATH,
          backendAuditPath: values['backend-audit'] || DEFAULT_BACKEND_AUDIT_PATH,
          frontendAuditPath: values['frontend-audit'] || DEFAULT_FRONTEND_AUDIT_PATH,
          observedOn: values['observed-on'] || operationalDate(),
        });
        console.log(
          `Pending observations updated with ${Object.keys(result.store.items).length} items`
        );
        result.warnings.forEach((warning) => console.warn(`- ${warning}`));
        if (result.failures.length > 0) {
          result.failures.forEach((failure) => console.error(`- ${failure}`));
          process.exit(1);
        }
        return;
      }
      default:
        printHelp();
    }
  } catch (error) {
    console.error(error.message);
    if (error.code === 'ERR_CLI_USAGE' || error.code?.startsWith('ERR_PARSE_ARGS_')) {
      printHelp();
      process.exit(2);
    }
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  buildScaFindingId,
  buildSastFindingId,
  businessDaysSince,
  collectAuditAdvisoriesFromFile,
  collectMigrationGaps,
  createEmptyPendingObservationsStore,
  createRegister,
  createScaBaseline,
  createScaBaselines,
  loadScanTypes,
  mapSeverity,
  operationalDate,
  updatePendingObservations,
  validatePendingObservations,
  validateRegister,
  writeJson,
};
