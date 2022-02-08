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
  // get all distinct recipient ids from recipients with the proper scopes applied
  const allRecipientsFiltered = await Recipient.findAll({
    attributes: [
      [sequelize.fn('DISTINCT', sequelize.col('"Recipient"."id"')), 'id'],
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

  // create a distinct array of recipient ids (we'll need this later, to filter the AR recipients)
  const totalRecipientIds = allRecipientsFiltered.map(({ id }) => id);

  // this is the number used in the API response, also to calculate the percentage
  const totalRecipients = totalRecipientIds.length;

  // here's where we use that array of ids to do the filtering, and get a distinct count of
  // recipient ids within the array of applicable recipients and within the activity report
  // Doing this specifically to avoid situations where the filters would return only one recipient
  // (filtering by grant number, for example) but multi-recipient AR's create a larger numerator
  // than denominator, therefore the numerator should only include recipient ids within
  // the matching denominator set
  const [{ numRecipients }] = await ActivityReport.findAll({
    attributes: [
      [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('"activityRecipients->grant->recipient"."id"'))), 'numRecipients'],
    ],
    raw: true,
    where: {
      [Op.and]: [scopes.activityReport],
      calculatedStatus: REPORT_STATUSES.APPROVED,
    },
    includeIgnoreAttributes: false,
    include: [
      {
        model: ActivityRecipient,
        as: 'activityRecipients',
        attributes: [],
        required: true,
        include: [
          {
            model: Grant,
            as: 'grant',
            attributes: [
              'id',
            ],
            required: true,
            include: [
              {
                model: Recipient,
                as: 'recipient',
                attributes: ['id'],
                required: true,
                where: {
                  id: totalRecipientIds,
                },
              },
            ],
          },
        ],
      },
    ],
  });

  /**
   * this looks a little strange... why create another SQL queries?
   *
   * The answer - the includes/required: false on the second query
   * causes the joins to be left outer joins, which will give us duplicated
   * activity reports, and incorrect numbers. this also can't be joined with the one
   * above, since that one is excluding some of these reports by recipients
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

  // our final query, it stands on its own as explained in the comment for the last one
  const [res] = await ActivityReport.findAll({
    attributes: [
      [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('"ActivityReport".id'))), 'numReports'],
      [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('"activityRecipients->grant"."id"'))), 'numGrants'],
      [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('"activityRecipients"."otherEntityId"'))), 'numOtherEntities'],
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
        required: true,
        include: [
          {
            model: Grant,
            as: 'grant',
            attributes: [],
            required: false,
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
  const rawPercentage = (numRecipients / totalRecipients) * 100;
  const recipientPercentage = `${formatNumber(rawPercentage, 2)}%`;

  const { numReports, numGrants, numOtherEntities } = res;

  return {
    numReports: formatNumber(numReports),
    numGrants: formatNumber(numGrants),
    numOtherEntities: formatNumber(numOtherEntities),
    recipientPercentage,
    numRecipients: numRecipients.toString(),
    totalRecipients: totalRecipients.toString(),
    inPerson,
    sumDuration: formatNumber(sumDuration),
    numParticipants: formatNumber(numParticipants),
  };
}
