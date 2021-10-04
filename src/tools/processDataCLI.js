import processData from './processData';
import { auditLogger } from '../logger';

processData().catch((e) => {
  auditLogger.error(e);
  process.exit(1);
});
