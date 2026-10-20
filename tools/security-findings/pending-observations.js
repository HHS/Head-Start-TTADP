const { execFileSync } = require('node:child_process');

const {
  DEFAULT_BACKEND_AUDIT_PATH,
  DEFAULT_FRONTEND_AUDIT_PATH,
  DEFAULT_PENDING_OBSERVATIONS_PATH,
  DEFAULT_REGISTER_PATH,
  DEFAULT_SCAN_TYPES_PATH,
  VALID_PENDING_ESCALATION_STATES,
} = require('./constants');
const { collectAuditAdvisoriesFromFile } = require('./sca');
const { loadScanTypes, mapSeverity } = require('./scan-types');
const {
  businessDaysSince,
  compareDates,
  isMissingGitObjectError,
  operationalDate,
  pathExists,
  readJson,
  resolveProjectPath,
  toGitPath,
  validateGitRevision,
  validateIsoDate,
  validateObject,
  writeJson,
} = require('./utilities');

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

module.exports = {
  buildPendingObservationEntry,
  collectCurrentScaFindings,
  createEmptyPendingObservationsStore,
  getActiveScaRegisterIds,
  loadPendingObservationsStore,
  loadPendingObservationsStoreFromGitRef,
  loadTrustedPendingObservationsStore,
  slaThresholdForSeverity,
  updatePendingObservations,
  validatePendingObservations,
  validatePendingObservationsStore,
};
