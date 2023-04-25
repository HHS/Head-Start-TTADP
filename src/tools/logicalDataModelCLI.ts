import logicalDataModel from './logicalDataModel';
import { auditLogger } from '../logger';

logicalDataModel().catch((e) => {
  auditLogger.error(e);
  process.exit(1);
});
