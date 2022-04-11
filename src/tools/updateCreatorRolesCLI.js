import updateCreatorRoles from './updateCreatorRoles';
import { auditLogger } from '../logger';

updateCreatorRoles().catch((e) => {
  auditLogger.error(e);
  process.exit(1);
});
