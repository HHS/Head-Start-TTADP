import { DECIMAL_BASE } from '../../constants';
import { sequelize } from '../../models';

const grantee = '(SELECT UNNEST(ARRAY_AGG("Grantee"."id")) FROM "Grantees" AS "Grantee" INNER JOIN "ActivityRecipients" ON "ActivityReport"."id" = "ActivityRecipients"."activityReportId" JOIN "Grants" ON "Grants"."id" = "ActivityRecipients"."grantId" AND "Grantee"."id" = "Grants"."granteeId" GROUP BY "ActivityReport"."id")';

export default function withGranteeId(id) {
  const [g] = id; // we're only parsing the first one right now
  const granteeId = sequelize.escape(parseInt(g, DECIMAL_BASE));
  return sequelize.literal(`${granteeId} = ANY ${grantee}`);
}
