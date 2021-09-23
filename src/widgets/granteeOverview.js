import { Op } from 'sequelize';

import {
  ActivityReport, ActivityRecipient, Grant, NonGrantee, sequelize,
} from '../models';
import { REPORT_STATUSES } from '../constants';

export default async function granteeOverview(scopes) {
  const duration = await ActivityReport.findAll({
    attributes: [
      'duration',
      'deliveryMethod',
      'numberOfParticipants',
    ],
    where: {
      [Op.and]: [scopes],
      status: REPORT_STATUSES.APPROVED,
    },
    raw: true,
    includeIgnoreAttributes: false,
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
      // This is a literal because it needs to *not* respect the scopes passed in
      // [sequelize.literal(`(SELECT COUNT(*) from "Grants" ${grantsWhere})`), 'numTotalGrants'],
      [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('"ActivityReport".id'))), 'numReports'],
      [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('"activityRecipients->grant"."id"'))), 'numGrants'],
    ],
    where: {
      [Op.and]: [scopes],
      status: REPORT_STATUSES.APPROVED,
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
