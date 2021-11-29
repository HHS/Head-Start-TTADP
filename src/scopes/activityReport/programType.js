import { Op } from 'sequelize';
import { filterAssociation } from './utils';

const programTypes = `
    SELECT "ActivityRecipients"."activityReportId" FROM "ActivityRecipients"
    INNER JOIN "Grants" ON "Grants".id = "ActivityRecipients"."grantId"
    INNER JOIN "Programs" ON "Programs"."grantId" = "Grants"."id" 
    WHERE "Programs"."programType"`;

export function withProgramTypes(types) {
  return filterAssociation(programTypes, types, false, '~*', Op.or);
}

export function withoutProgramTypes(types) {
  return filterAssociation(programTypes, types, true, '~*', Op.or);
}
