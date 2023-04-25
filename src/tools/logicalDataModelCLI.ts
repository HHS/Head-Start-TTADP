import logicalDataModel from './logicalDataModel';
import { auditLogger } from '../logger';

try {
  logicalDataModel();
  process.exit(0);
} catch (err) {
  auditLogger.error(err);
  process.exit(1);
}
