import restoreTopics from './restoreTopics';
import { auditLogger } from '../logger';

restoreTopics().catch((e) => {
  auditLogger.error(e);
  return process.exit(1);
});
