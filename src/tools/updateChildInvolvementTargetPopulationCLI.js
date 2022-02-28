import updateChildInvolvementTargetPopulation from './updateChildInvolvementTargetPopulation';
import { auditLogger } from '../logger';

updateChildInvolvementTargetPopulation().catch((e) => {
  auditLogger.error(e);
  process.exit(1);
});
