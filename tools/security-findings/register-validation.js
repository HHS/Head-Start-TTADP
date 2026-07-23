const {
  DEFAULT_BACKEND_BASELINE_PATH,
  DEFAULT_FRONTEND_BASELINE_PATH,
  DEFAULT_REGISTER_PATH,
  DEFAULT_SAST_BASELINE_PATH,
  DEFAULT_SCAN_TYPES_PATH,
  DUE_DATE_GRACE_DAYS,
  DUE_DATE_WARNING_DAYS,
  VALID_ACCEPTANCE_TYPES,
  VALID_DISPOSITIONS,
  VALID_REGISTER_SEVERITIES,
  VALID_SCAN_TYPES,
} = require('./constants');
const {
  collectMigrationGaps,
  getApprovalEvidenceIssues,
  isIncompleteMigrationEntry,
} = require('./register');
const { loadScanTypes, mapSeverity } = require('./scan-types');
const {
  buildSastFindingId,
  calendarDaysBetween,
  compareDates,
  isValidJiraTicket,
  operationalDate,
  readJson,
  resolveProjectPath,
  validateArray,
  validateIsoDate,
  validateObject,
} = require('./utilities');

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

    if (entry.ticket && !isValidJiraTicket(entry.ticket)) {
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

module.exports = {
  arraysMatch,
  enforceDispositionDeadlines,
  reconcileCurrentFindings,
  reconcileRegisterWithCurrentEvidence,
  validateApprovalEvidence,
  validateRegister,
  validateSastBaselineEvidence,
  validateScaBaselineEvidence,
};
