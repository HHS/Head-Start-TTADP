import bootstrapEs from './bootstrapEs';
import { auditLogger } from '../logger';

bootstrapEs().catch((e) => {
  auditLogger.error(e);
  return process.exit(1);
});
