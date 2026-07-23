/* eslint-disable no-console */

const { parseArgs } = require('node:util');

const {
  DEFAULT_BACKEND_AUDIT_PATH,
  DEFAULT_BACKEND_BASELINE_PATH,
  DEFAULT_FRONTEND_AUDIT_PATH,
  DEFAULT_FRONTEND_BASELINE_PATH,
  DEFAULT_PENDING_OBSERVATIONS_PATH,
  DEFAULT_REGISTER_PATH,
  DEFAULT_SAST_BASELINE_PATH,
  DEFAULT_SAST_DISPOSITIONS_PATH,
  DEFAULT_SCAN_TYPES_PATH,
} = require('./constants');
const {
  updatePendingObservations,
  validatePendingObservations,
} = require('./pending-observations');
const { createRegister } = require('./register');
const { validateRegister } = require('./register-validation');
const { createScaBaselines } = require('./sca');
const {
  assertRegisterCanBeSeeded,
  operationalDate,
  pathExists,
  resolveProjectPath,
  validateJiraTicket,
} = require('./utilities');

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
          ticket = validateJiraTicket(values.ticket, { required: true });
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

module.exports = {
  main,
  parseCliArguments,
  printHelp,
  printValidationSummary,
};
