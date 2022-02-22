import exportFileMetadata from './exportFileMetadata';
import { auditLogger } from '../logger';

exportFileMetadata().catch((e) => {
  auditLogger.error(e);
  process.exit(1);
});
