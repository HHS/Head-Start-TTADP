import { Op } from 'sequelize';
import { REPORT_STATUSES, REASONS } from '@ttahub/common';
import { ActivityReport } from '../models';
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
