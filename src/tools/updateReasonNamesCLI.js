import updateReasonNames from './updateReasonNames';
import { auditLogger } from '../logger';

updateReasonNames().catch((e) => {
  auditLogger.error(e);
  process.exit(1);
});
