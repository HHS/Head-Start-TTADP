import { Op } from 'sequelize';
import { REPORT_STATUSES, TARGET_POPULATIONS } from '@ttahub/common';
import { ActivityReport } from '../models';
import { countBySingleKey } from './helpers';

export default async function targetPopulationTable(scopes) {
  const res = await ActivityReport.findAll({
    attributes: [
      'targetPopulations',
    ],
    where: {
      [Op.and]: [
        scopes.activityReport,
        { calculatedStatus: REPORT_STATUSES.APPROVED },
      ],
    },
    raw: true,
  });

  const populations = TARGET_POPULATIONS.map((population) => ({ name: population, count: 0 }));

  return countBySingleKey(res, 'targetPopulations', populations);
}
