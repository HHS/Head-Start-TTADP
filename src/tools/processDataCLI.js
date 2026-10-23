import { auditLogger } from '../logger';
import processData from './processData';

// Log only the error's identity, not the error object: Sequelize errors carry the full SQL
// (including the data being processed) and connection details, and these logs are not private.
export const logProcessDataError = (e) => {
  const code = e?.parent?.code ?? e?.code;
  auditLogger.error(
    `processData failed: ${e?.name ?? 'Error'}: ${e?.message ?? e}${code ? ` (code ${code})` : ''}`
  );
};

processData().catch((e) => {
  logProcessDataError(e);
  process.exit(1);
});
