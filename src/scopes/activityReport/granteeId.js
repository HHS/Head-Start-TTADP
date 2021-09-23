import { Op } from 'sequelize';
import { sequelize } from '../../models';

export default function withGranteeId(granteeId) {
  return sequelize.where(
    sequelize.col('"Grantees".id FROM "Grantees" INNER JOIN "ActivityRecipients" ON "ActivityReport"."id" = "ActivityRecipients"."activityReportId" JOIN "Grants" ON "Grants"."id" = "ActivityRecipients"."grantId" AND "Grantees"."id" = "Grants"."granteeId" GROUP BY "ActivityRecipients"."activityReportId"'),
    {
      [Op.eq]: granteeId,
    },
  );
}
