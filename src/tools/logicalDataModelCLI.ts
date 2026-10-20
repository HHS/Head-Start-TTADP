import { auditLogger } from '../logger';
import logicalDataModel from './logicalDataModel';

logicalDataModel()
  .then(() => process.exit())
  .catch((e) => {
    auditLogger.error(e);
    process.exit(1);
  });
