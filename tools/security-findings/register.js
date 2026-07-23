const {
  DEFAULT_BACKEND_BASELINE_PATH,
  DEFAULT_FRONTEND_BASELINE_PATH,
  DEFAULT_REGISTER_PATH,
  DEFAULT_SAST_BASELINE_PATH,
  DEFAULT_SAST_DISPOSITIONS_PATH,
  DEFAULT_SCAN_TYPES_PATH,
} = require('./constants');
const { loadScanTypes, mapSeverity } = require('./scan-types');
const {
  assertRegisterCanBeSeeded,
  buildSastFindingId,
  readJson,
  registerOverwriteError,
  resolveProjectPath,
  squashWhitespace,
  validateArray,
  validateIsoDate,
  validateJiraTicket,
  validateObject,
  writeJson,
} = require('./utilities');

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
  const validatedTicket = validateJiraTicket(ticket);
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
      ticket: validatedTicket,
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

module.exports = {
  buildApprovalEvidenceFromLegacyDisposition,
  buildSastRegisterEntries,
  buildScaRegisterEntries,
  collectMigrationGaps,
  createRegister,
  getApprovalEvidenceIssues,
  isIncompleteMigrationEntry,
  mapLegacySemgrepDisposition,
  sortRegisterEntries,
  summarizeRegister,
};
