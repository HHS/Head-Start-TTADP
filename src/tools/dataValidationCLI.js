import dataValidation from './dataValidation';
import { auditLogger } from '../logger';

/**
 * dataValidationCLI runs basic queries against the DB to verify that the db state
 * is as we expect following import or restore operations.
 */

dataValidation().catch((e) => {
  auditLogger.error(e);
  return process.exit(1);
});
