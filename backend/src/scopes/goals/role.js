import { Op } from 'sequelize';
import { filterAssociation } from './utils';

const roleFilter = `
SELECT
  DISTINCT "Goal"."id"
FROM "Objectives" "Objectives"
INNER JOIN "ObjectiveRoles" "ObjectiveRoles"
ON "Objectives"."id" = "ObjectiveRoles"."objectiveId"
INNER JOIN "Roles" "Roles"
ON "ObjectiveRoles"."roleId" = "Roles"."id"
INNER JOIN "Goals" "Goal"
ON "Objectives"."goalId" = "Goal"."id"
WHERE "Roles"."name"`;

export function withRoles(roles) {
  return {
    [Op.or]: [
      filterAssociation(roleFilter, roles, false),
    ],
  };
}

export function withoutRoles(roles) {
  return {
    [Op.and]: [
      filterAssociation(roleFilter, roles, true),
    ],
  };
}
