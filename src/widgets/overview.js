import { Op } from 'sequelize';
import {
  ActivityReport, ActivityRecipient, Grant, NonGrantee, sequelize,
} from '../models';
import { REPORT_STATUSES } from '../constants';
/*
  Widgets on the backend should only have to worry about fetching data in the format required
  by the widget. In this case we return a single object but other widgets my require an array
  (say for a time series). All widgets will need to honor the scopes that are passed in. All
  that is required is that the scopes parameter is used as value for the `where` parameter (or
  combined with [op.and] if the widget needs to add additional conditions to the query).

  If adding a new widget be sure to add the widget to ./index.js
*/
export default async function overview(scopes, query) {
  const { region } = query;
  const grantsWhere = `WHERE "regionId" in (${region})`;
  const baseWhere = `${grantsWhere} AND "status" = '${REPORT_STATUSES.APPROVED}'`;
  // There could be a better way, but using sequelize.literal was the only way I could get correct
  // numbers for SUM
  // FIXME: see if there is a better way to get totals using SUM
  const res = await ActivityReport.findAll({
    attributes: [
      [
        sequelize.fn(
          'COUNT',
          sequelize.fn('DISTINCT', sequelize.col('"ActivityReport".id')),
        ),
        'numReports',
      ],
      [
        sequelize.fn(
          'COUNT',
          sequelize.fn(
            'DISTINCT',
            sequelize.col('"activityRecipients->grant"."id"'),
          ),
        ),
        'numGrants',
      ],
      [
        sequelize.literal(`(SELECT COUNT(*) from "Grants" ${grantsWhere})`),
        'numTotalGrants',
      ],
      [
        sequelize.fn(
          'COUNT',
          sequelize.fn(
            'DISTINCT',
            sequelize.col('"activityRecipients"."nonGranteeId"'),
          ),
        ),
        'numNonGrantees',
      ],
      [
        sequelize.literal(
          `(SELECT COALESCE(SUM("numberOfParticipants"), 0) FROM "ActivityReports" ${baseWhere})`,
        ),
        'numParticipants',
      ],
      [
        sequelize.literal(
          `(SELECT COALESCE(SUM(duration), 0) FROM "ActivityReports" ${baseWhere})`,
        ),
        'sumDuration',
      ],
    ],
    where: {
      [Op.and]: [
        scopes,
        { status: REPORT_STATUSES.APPROVED },
      ],
    },
    raw: true,
    // without 'includeIgnoreAttributes' the attributes from the join table
    // "activityReportObjectives" are included which causes postgres to error when
    // those attributes are not aggregated or used in a group by (since all the
    // other DB fields are aggregated)
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
  return res[0];
}
