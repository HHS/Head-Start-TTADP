import updateParticipantsList from './updateParticipantsList';
import { auditLogger } from '../logger';

updateParticipantsList().catch((e) => {
  auditLogger.error(e);
  process.exit(1);
});
