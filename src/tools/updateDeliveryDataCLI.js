import updateDeliveryData from './updateDeliveryData';
import { auditLogger } from '../logger';

updateDeliveryData().catch((e) => {
  auditLogger.error(e);
  process.exit(1);
});
