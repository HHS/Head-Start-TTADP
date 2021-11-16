import { Op } from 'sequelize';
import { ActivityReport } from '../models';
import { REPORT_STATUSES } from '../constants';
import { countBySingleKey } from './helpers';

export default async function reasonList(scopes) {
  // Query Database for all Reasons within the scope.
  const res = await ActivityReport.findAll({
    attributes: [
      'reason',
    ],
    where: {
      [Op.and]: [
        scopes,
        { calculatedStatus: REPORT_STATUSES.APPROVED },
      ],
    },
    raw: true,
  });

  // Return only top 14.
  return countBySingleKey(res, 'reason');
}
