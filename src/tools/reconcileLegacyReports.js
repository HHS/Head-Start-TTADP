import reconcileLegacyReports from '../services/legacyreports';
import { auditLogger } from '../logger';

reconcileLegacyReports().catch((e) => {
  auditLogger.error(e);
  process.exit(1);
});
