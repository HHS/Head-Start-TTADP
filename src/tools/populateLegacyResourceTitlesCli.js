import processLegacyResources from './populateLegacyResourceTitles';
import { auditLogger } from '../logger';

processLegacyResources().catch((e) => {
  auditLogger.error(e);
  return process.exit(1);
});
