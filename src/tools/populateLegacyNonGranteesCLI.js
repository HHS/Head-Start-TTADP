import populateLegacyNonGrantees from './populateLegacyNonGrantees';
import { auditLogger } from '../logger';

populateLegacyNonGrantees().catch((e) => {
  auditLogger.error(e);
  process.exit(1);
});
