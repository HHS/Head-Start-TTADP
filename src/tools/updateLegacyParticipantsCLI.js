import updateLegacyParticipants from './updateLegacyParticipants';
import { auditLogger } from '../logger';

updateLegacyParticipants().catch((e) => {
  auditLogger.error(e);
  process.exit(1);
});
