import { Op } from 'sequelize';
import { ActivityReport, ActivityReportApproval } from '../models';
import { REPORT_STATUSES, TARGET_POPULATIONS } from '../constants';
import { countBySingleKey } from './helpers';
import { auditLogger } from '../logger';

export default async function targetPopulationTable(scopes) {
  const res = await ActivityReport.findAll({
    attributes: [
      'targetPopulations',
    ],
    where: {
      [Op.and]: [
        scopes.activityReport,
        { '$approval.calculatedStatus$': REPORT_STATUSES.APPROVED },
      ],
    },
    include: [{ model: ActivityReportApproval, as: 'approval', required: true }],
    raw: true,
  });
  auditLogger.error(JSON.stringify(res));

  const populations = TARGET_POPULATIONS.map((population) => ({ name: population, count: 0 }));

  return countBySingleKey(res, 'targetPopulations', populations);
}
