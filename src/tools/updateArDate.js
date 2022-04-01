import { auditLogger } from '../logger';
import {
  ActivityReport,
  sequelize,
} from '../models';

export default async function updateArDate(legacyId = 'R09-AR-000247') {
  return sequelize.transaction(async (transaction) => {
    auditLogger.info(`updating report dates for report with ${legacyId}`);
    const report = await ActivityReport.findOne({
      where: {
        legacyId,
        imported: {
          startDate: '12/21/21',
          endDate: '12/21/21',
        },
      },
    });

    if (!report) {
      auditLogger.info('No matching reports found');
      return true;
    }

    const textDate = '12/21/20';
    const d = new Date(2020, 11, 21);

    auditLogger.info('1 report found, updating');

    return report.update({
      imported: { ...report.imported, startDate: textDate, endDate: textDate },
      endDate: d,
      startDate: d,
    }, {
      transaction,
    });
  });
}
