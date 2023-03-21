import { Op } from 'sequelize';
import { ActivityReport, ActivityReportApproval } from '../models';
import { REPORT_STATUSES, REASONS } from '../constants';
import { countBySingleKey } from './helpers';

export default async function reasonList(scopes) {
  // Query Database for all Reasons within the scope.
  const res = await ActivityReport.findAll({
    attributes: [
      'reason',
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

  const reasons = REASONS
    .map((reason) => ({ name: reason, count: 0 }))
    .sort((a, b) => {
      if (a.name < b.name) {
        return -1;
      }
      if (a.name > b.name) {
        return 1;
      }
      return 0;
    });

  return countBySingleKey(res, 'reason', reasons);
}
