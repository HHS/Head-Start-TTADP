import populateLegacyOtherEntities from './populateLegacyOtherEntities';
import { auditLogger } from '../logger';

populateLegacyOtherEntities().catch((e) => {
  auditLogger.error(e);
  process.exit(1);
});
