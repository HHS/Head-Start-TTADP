import { Op } from 'sequelize';
import { sequelize } from '../../models';

export default function withGranteeId(id) {
  function reportInSubQuery(baseQuery, searchTerms, operator) {
    return searchTerms.map((term) => sequelize.literal(`"ActivityReport"."id" ${operator} (${baseQuery} = ${sequelize.escape(term)})`));
  }

  const query = 'SELECT "ActivityRecipients"."activityReportId" FROM "Grantees" INNER JOIN "Grants" ON "Grants"."granteeId" = "Grantees"."id" INNER JOIN "ActivityRecipients" ON "ActivityRecipients"."grantId" = "Grants"."id" WHERE "Grantees".id';

  return {
    [Op.and]: reportInSubQuery(query, id, 'IN'),
  };
}
