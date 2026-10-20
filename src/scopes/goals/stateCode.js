import { filterAssociation } from './utils';

const stateCodeQuery = `
  SELECT DISTINCT "Goals"."id"
  FROM "Goals"
  INNER JOIN "Grants"
  ON "Grants"."id" = "Goals"."grantId"
  WHERE "Grants"."stateCode"`;

export function withStateCode(stateCodes) {
  return filterAssociation(stateCodeQuery, stateCodes, false, '=');
}

export function withoutStateCode(stateCodes) {
  return filterAssociation(stateCodeQuery, stateCodes, true, '=');
}
