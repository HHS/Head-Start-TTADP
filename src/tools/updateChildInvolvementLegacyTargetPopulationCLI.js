import updateChildInvolvementLegacyTargetPopulation from './updateChildInvolvementLegacyTargetPopulation';
import { auditLogger } from '../logger';

updateChildInvolvementLegacyTargetPopulation().catch((e) => {
  auditLogger.error(e);
  process.exit(1);
});
