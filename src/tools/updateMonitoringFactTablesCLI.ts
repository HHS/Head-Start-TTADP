/* eslint-disable no-console */

import { auditLogger } from '../logger';
import { snapshotDeliveredReviewMrids } from '../services/monitoringDeliveries';
import { notifyNewMonitoringDeliveries } from '../services/monitoringDeliveryNotifications';
import updateMonitoringFactTables from './updateMonitoringFactTables';

export const run = async () => {
  const previouslyDeliveredMrids = await snapshotDeliveredReviewMrids();
  await updateMonitoringFactTables();

  // The refresh has committed by now. A notification failure is logged but does not fail
  // the refresh.
  try {
    await notifyNewMonitoringDeliveries(previouslyDeliveredMrids);
  } catch (err) {
    auditLogger.error(`Error sending monitoring delivery notifications: ${err}`);
  }
};

if (require.main === module) {
  run().then(
    () => {
      process.exit(0);
    },
    (e) => {
      auditLogger.error(e);
      process.exit(1);
    }
  );
}
