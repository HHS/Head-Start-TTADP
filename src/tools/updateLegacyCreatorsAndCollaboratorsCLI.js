import updateLegacyCreatorsAndCollaborators from './updateLegacyCreatorsAndCollaborators';
import { auditLogger } from '../logger';

updateLegacyCreatorsAndCollaborators().catch((e) => {
  auditLogger.error(e);
  process.exit(1);
});
