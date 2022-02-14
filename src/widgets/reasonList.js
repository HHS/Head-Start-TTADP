import { Op } from 'sequelize';
import { ActivityReport } from '../models';
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
        { calculatedStatus: REPORT_STATUSES.APPROVED },
      ],
    },
    raw: true,
  });

  const reasons = REASONS.map((reason) => ({ name: reason, count: 0 }));

  return countBySingleKey(res, 'reason', reasons);
}
