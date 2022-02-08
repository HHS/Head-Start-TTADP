import updateLegacyCreatorAndCollaborator from './updateLegacyCreatorAndCollaborator';
import { auditLogger } from '../logger';

updateLegacyCreatorAndCollaborator().catch((e) => {
  auditLogger.error(e);
  process.exit(1);
});
