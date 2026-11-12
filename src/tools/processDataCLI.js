import { auditLogger } from '../logger';
import processData from './processData';
import verifyProcessedData from './verifyProcessedData';

// Log a fixed message with only an allowlisted error name and code, never the error's message or
// properties: Sequelize/PostgreSQL errors can carry the SQL, rejected input values (for example
// 'invalid input syntax for type integer: "someone@example.org"') and connection details, and
// these logs are not private.
const SAFE_NAME = /^[A-Za-z][A-Za-z0-9]{0,63}$/;
const SAFE_CODE = /^[A-Za-z0-9_]{1,16}$/;

export const logProcessDataError = (e) => {
  const name = typeof e?.name === 'string' && SAFE_NAME.test(e.name) ? e.name : 'Error';
  const rawCode = e?.parent?.code ?? e?.code;
  const code =
    (typeof rawCode === 'string' || typeof rawCode === 'number') && SAFE_CODE.test(String(rawCode))
      ? ` (code ${rawCode})`
      : '';
  auditLogger.error(`processData failed: ${name}${code}`);
};

// Verify inside the processData transaction, so a run that did not anonymize the data rolls back
// and exits non-zero, and the nightly restore_db_cron job never backs it up for lower environments
processData(undefined, { verify: verifyProcessedData }).catch((e) => {
  logProcessDataError(e);
  process.exit(1);
});
