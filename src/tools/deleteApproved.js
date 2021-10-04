/* eslint-disable no-restricted-syntax */
import { REPORT_STATUSES } from '../constants';
import {
  ActivityReport,
} from '../models';
import { auditLogger } from '../logger';

/**
 * deleteApproved script soft deletes activity reports based on ids. The
 * reports' status are chanaged to 'deleted'. The script expects a comma
 * separated ids.
 */

export default async function deleteApproved(ids) {
  const idsArray = ids.split(',');

  const promises = [];

  for await (const id of idsArray) {
    const report = await ActivityReport.findOne({ where: { id } });

    if (report) {
      auditLogger.info(`Deleting report: ${id}`);
      promises.push(
        report.update({
          status: REPORT_STATUSES.DELETED,
        }),
      );
    } else {
      auditLogger.info(`Couldn't find any reports with the id: ${id}`);
    }
  }

  return Promise.all(promises);
}
