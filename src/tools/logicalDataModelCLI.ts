import logicalDataModel from './logicalDataModel';
import { auditLogger } from '../logger';

try {
  logicalDataModel(null, null, null);
} catch (err) {
  auditLogger.error(err);
  process.exit(1);
}
