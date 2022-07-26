import removeCruftFromArResources from './removeCruftFromArResources';
import { auditLogger } from '../logger';

removeCruftFromArResources().catch((e) => {
  auditLogger.error(e);
  return process.exit(1);
});
