import {
  ActivityReport, ActivityRecipient, Grant, Recipient, OtherEntity, sequelize, Objective,
} from '../models';

/*
  Widgets on the backend should only have to worry about fetching data in the format required
  by the widget. In this case we return a single object but other widgets my require an array
  (say for a time series). All widgets will need to honor the scopes that are passed in. All
  that is required is that the scopes parameter is used as value for the `where` parameter (or
  combined with [op.and] if the widget needs to add additional conditions to the query).

  If adding a new widget be sure to add the widget to ./index.js
*/
export default async function example(scopes) {
  const filterGen = (where) => sequelize.literal(`COUNT(*) FILTER ${where}`);

  const res = await ActivityReport.findAll({
    attributes: [
      [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('"ActivityReport".id'))), 'numReports'],
      // I really don't like `"activityRecipients->grant->recipient"."id"` but couldn't find a way
      // to have sequelize leave table names alone (`required: false` makes sequelize alias tables
      // for some reason)
      [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('"activityRecipients->grant->recipient"."id"'))), 'numRecipients'],
      [filterGen('(WHERE "requester" = \'Recipient\')'), 'numRecipientRequests'],
      [filterGen('(WHERE "requester" = \'Regional Office\')'), 'numRegionalOfficeRequests'],
      [sequelize.fn('SUM', sequelize.col('duration')), 'sumDuration'],
      [filterGen('(WHERE "objectives"."status" = \'Complete\')'), 'numCompleteObjectives'],
    ],
    where: scopes,
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
            include: [{
              model: Recipient,
              attributes: [],
              as: 'recipient',
            }],
          },
          {
            model: OtherEntity,
            attributes: [],
            as: 'otherEntity',
            required: false,
          },
        ],
      },
      {
        model: Objective,
        attributes: [],
        as: 'objectives',
        required: false,
      },
    ],
  });
  return res[0];
}
