import { filterAssociation } from './utils';

export default function withStateCode(stateCode) {
  const query = `
  SELECT DISTINCT "Goals"."id"
  FROM "Goals"
  INNER JOIN "Grants"
  ON "Grants"."id" = "Goals"."grantId"
  WHERE "Grants"."stateCode"`;

  return filterAssociation(query, stateCode, false, '=');
}
