/* eslint-disable import/prefer-default-export */
import { Op } from 'sequelize';
import { sequelize } from '../../models';

const grantsMissingActivitySql = (beginActivityDate, finishActivityDate) => sequelize.literal(
  `
    (WITH activity AS (
      SELECT
        DISTINCT g."recipientId" AS used_recipient_id
      FROM "Grants" g
      JOIN "ActivityRecipients" arr
        ON g.id = arr."grantId"
      JOIN "ActivityReports" ar
        ON arr."activityReportId" = ar.id
      WHERE
        ar."startDate" <= ${sequelize.escape(finishActivityDate)}
        AND ar."endDate" >= ${sequelize.escape(beginActivityDate)}
    )
    SELECT
      g."id"
    FROM "Grants" g
    WHERE g."recipientId" NOT IN (SELECT used_recipient_id FROM activity))
    `,
);

export function noActivityWithin(dates) {
  const [startActivityDate, endActivityDate] = dates[0].split('-');

  return {
    where: {
      id: {
        [Op.in]: grantsMissingActivitySql(startActivityDate, endActivityDate),
      },
    },
  };
}
