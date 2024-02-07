import { filterAssociation } from './utils';

export default function withStateCode(stateCode) {
  const query = `
  SELECT
    "ActivityRecipients"."activityReportId"
  FROM "Grants" "Grants"
  INNER JOIN "ActivityRecipients" "ActivityRecipients"
  ON "ActivityRecipients"."grantId" = "Grants"."id"
  WHERE "Grants"."stateCode"`;

  return filterAssociation(query, stateCode, false, '=');
}
