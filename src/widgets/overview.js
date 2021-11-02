import { Op } from 'sequelize';

import {
  ActivityReport, ActivityRecipient, Grant, NonGrantee, sequelize,
} from '../models';
import { REPORT_STATUSES } from '../constants';

export default async function dashboardOverview(scopes) {
  /**
   * this looks a little strange... why create two SQL queries?
   *
   * The answer - the includes/required: false on the second query
   * causes the joins to be left outer joins, which will give us duplicated
   * activity reports, and incorrect numbers
   */
  const duration = await ActivityReport.findAll({
    attributes: [
      'duration',
      'deliveryMethod',
      'numberOfParticipants',
    ],
    where: {
      [Op.and]: [scopes],
      calculatedStatus: REPORT_STATUSES.APPROVED,
    },
    raw: true,
  });

  // eslint-disable-next-line max-len
  const sumDuration = duration.reduce((acc, report) => acc + (report.duration ? parseFloat(report.duration) : 0), 0)
    .toFixed(1)
    .toString();

  const inPerson = duration.filter((report) => report.deliveryMethod.toLowerCase() === 'in-person').length
    .toString();

  // eslint-disable-next-line max-len
  const numParticipants = duration.reduce((prev, ar) => prev + (ar.numberOfParticipants ? parseInt(ar.numberOfParticipants, 10) : 0), 0)
    .toString();

  const res = await ActivityReport.findAll({
    attributes: [
      [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('"ActivityReport".id'))), 'numReports'],
      [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('"activityRecipients->grant"."id"'))), 'numGrants'],
      [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('"activityRecipients"."nonGranteeId"'))), 'numNonGrantees'],
    ],
    where: {
      [Op.and]: [scopes],
      calculatedStatus: REPORT_STATUSES.APPROVED,
    },
    raw: true,
    includeIgnoreAttributes: false,
    include: [
      {
        model: ActivityRecipient,
        as: 'activityRecipients',
        attributes: [],
        required: false,
        include: [
          {
            model: Grant,
            as: 'grant',
            attributes: [],
            required: false,
          },
          {
            model: NonGrantee,
            attributes: [],
            as: 'nonGrantee',
            required: false,
          },
        ],
      },
    ],
  });

  return {
    ...res[0],
    inPerson,
    sumDuration,
    numParticipants,
  };
}
