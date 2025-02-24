import { Op } from 'sequelize';
import { REPORT_STATUSES } from '@ttahub/common';
import { ActivityReport } from '../models';
import { countBySingleKey, generateReasonList } from './helpers';

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

  const reasons = generateReasonList();

  return countBySingleKey(res, 'reason', reasons);
}
