import { auditLogger } from '../logger';
import processData from './processData';

processData().catch((e) => {
  auditLogger.error(e);
  process.exit(1);
});
