import addMissingGrantsToReports from './addMissingGrantsToReports';
import { auditLogger } from '../logger';

/**
 * Some legacy reports do not have all grants listed because of
 * limitations of the previous system. This script adds grants to
 * those legacy reports.
 */
addMissingGrantsToReports('additional_grants.csv').catch((e) => {
  auditLogger.error(e);
  return process.exit(1);
});
