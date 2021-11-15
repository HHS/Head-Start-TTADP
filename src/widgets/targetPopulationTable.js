import { Op } from 'sequelize';
import { ActivityReport } from '../models';
import { REPORT_STATUSES } from '../constants';
import { countBySingleKey } from './helpers';

export default async function targetPopulationTable(scopes) {
  const res = await ActivityReport.findAll({
    attributes: [
      'targetPopulations',
    ],
    where: {
      [Op.and]: [
        scopes,
        { calculatedStatus: REPORT_STATUSES.APPROVED },
      ],
    },
    raw: true,
  });

  return countBySingleKey(res, 'targetPopulations');
}
