import updateLegacyPopulations from './updateLegacyPopulations';
import { auditLogger } from '../logger';

updateLegacyPopulations().catch((e) => {
  auditLogger.error(e);
  process.exit(1);
});
