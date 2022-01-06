import { filterAssociation } from './utils';

// this should return an array of activityReport ids. That where clause will be finished when the
// function is called
const programTypes = `
    SELECT "ActivityRecipients"."activityReportId" FROM "ActivityRecipients"
    INNER JOIN "Grants" ON "Grants".id = "ActivityRecipients"."grantId"
    INNER JOIN "Programs" ON "Programs"."grantId" = "Grants"."id" 
    WHERE "Programs"."programType"`;

/**
 *
 * - in the two functions below, type is expected to be an array of Program Types
 * - The filter association function takes a partial SQL statement and then creates an array of
 * SQL statements joined by an AND or an OR depending on which function is called
 * - see the ./utils.js file for more details

 * @param {*} types an array of strings
 * @returns an object with a where clause in the sequelize syntax
 */
export function withProgramTypes(types) {
  return filterAssociation(programTypes, types, false, '~*');
}

/**
 * @param {*} types an array of strings
 * @returns an object with a where clause in the sequelize syntax
 */
export function withoutProgramTypes(types) {
  return filterAssociation(programTypes, types, true, '~*');
}
