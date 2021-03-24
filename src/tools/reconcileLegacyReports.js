import reconcileLegacyReports from '../services/legacyreports';
import { auditLogger } from '../logger';

reconcileLegacyReports().then(process.exit(0)).catch((e) => {
  auditLogger.error(e);
  process.exit(1);
});
