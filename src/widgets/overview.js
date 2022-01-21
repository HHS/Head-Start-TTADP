import { Op } from 'sequelize';

import {
  ActivityReport,
  ActivityRecipient,
  Grant,
  OtherEntity,
  Recipient,
  sequelize,
} from '../models';
import { REPORT_STATUSES } from '../constants';
import { formatNumber } from './helpers';

export default async function overview(scopes) {
  const [{ totalRecipients }] = await Recipient.findAll({
    attributes: [
      [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('"Recipient".id'))), 'totalRecipients'],
    ],
    raw: true,
    include: [
      {
        attributes: [],
        model: Grant,
        as: 'grants',
        required: true,
        where: {
          [Op.and]: [
            scopes.grant,
          ],
        },
      },
    ],
  });

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
      [Op.and]: [scopes.activityReport],
      calculatedStatus: REPORT_STATUSES.APPROVED,
    },
    raw: true,
  });

  // eslint-disable-next-line max-len
  const sumDuration = duration.reduce((acc, report) => acc + (report.duration ? parseFloat(report.duration) : 0), 0)
    .toFixed(1)
    .toString();

  const inPerson = formatNumber(duration.filter((report) => report.deliveryMethod.toLowerCase() === 'in-person').length, 1).toString();

  // eslint-disable-next-line max-len
  const numParticipants = duration.reduce((prev, ar) => prev + (ar.numberOfParticipants ? parseInt(ar.numberOfParticipants, 10) : 0), 0)
    .toString();

  const [res] = await ActivityReport.findAll({
    attributes: [
      [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('"ActivityReport".id'))), 'numReports'],
      [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('"activityRecipients->grant"."id"'))), 'numGrants'],
      [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('"activityRecipients"."otherEntityId"'))), 'numOtherEntities'],
      [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('"activityRecipients->grant->recipient"."id"'))), 'numRecipients'],
    ],
    where: {
      [Op.and]: [scopes.activityReport],
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
            where: {
              [Op.and]: [
                scopes.grant,
              ],
            },
            include: [
              {
                model: Recipient,
                as: 'recipient',
                attributes: [],
                required: false,
              },
            ],
          },
          {
            model: OtherEntity,
            attributes: [],
            as: 'otherEntity',
            required: false,
          },
        ],
      },
    ],
  });

  // calculate the percentage
  const rawPercentage = (res.numRecipients / totalRecipients) * 100;
  const recipientPercentage = `${formatNumber(rawPercentage, 2)}%`;

  const response = {
    ...res,
    totalRecipients,
    recipientPercentage,
    inPerson,
    sumDuration,
    numParticipants,
  };

  return Object.keys(response)
    .reduce((acc, curr) => ({ ...acc, [curr]: formatNumber(response[curr]) }), {});
}
