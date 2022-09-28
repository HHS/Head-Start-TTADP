/* eslint-disable no-restricted-syntax */
import {
  ActivityReport,
  Approval,
} from '../models';
import { ENTITY_TYPES } from '../constants';
import { auditLogger } from '../logger';

/**
 * changeReportStatus script changes status of activity reports based on ids and status.
 * The script expects a comma separated ids and the new status.
 */

export default async function changeReportStatus(ids, status) {
  const idsArray = ids.split(',');
  for await (const id of idsArray) {
    const report = await ActivityReport.unscoped().findOne({ where: { id } });

    if (report) {
      auditLogger.info(`Changing status of report: ${id} to ${status}`);
      await Approval.update(
        {
          submissionStatus: status,
        },
        {
          where: { entityType: ENTITY_TYPES.REPORT, entityId: report.id },
          individualHooks: true,
        },
      );
    } else {
      auditLogger.info(`Couldn't find any reports with the id: ${id}`);
    }
  }
}
