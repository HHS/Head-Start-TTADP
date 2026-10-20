const {
  DEFAULT_SCAN_TYPES_PATH,
  VALID_REGISTER_SEVERITIES,
  VALID_SCAN_TYPES,
} = require('./constants');
const { readJson, resolveProjectPath, validateObject } = require('./utilities');

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

module.exports = {
  loadScanTypes,
  mapSeverity,
  validateScanTypes,
};
