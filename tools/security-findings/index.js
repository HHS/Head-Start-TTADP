const {
  buildScaFindingId,
  buildSastFindingId,
  businessDaysSince,
  operationalDate,
  writeJson,
} = require('./utilities');
const { collectAuditAdvisoriesFromFile, createScaBaseline, createScaBaselines } = require('./sca');
const { collectMigrationGaps, createRegister } = require('./register');
const { loadScanTypes, mapSeverity } = require('./scan-types');
const {
  createEmptyPendingObservationsStore,
  updatePendingObservations,
  validatePendingObservations,
} = require('./pending-observations');
const { validateRegister } = require('./register-validation');

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
