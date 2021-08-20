import { Op } from 'sequelize';
import { sequelize } from '../../models';

function escapeRole(role) {
  // our values (which doesn't include all db roles, only the roles selectable on the front end)
  const acceptableRoles = [
    'Early Childhood Specialist',
    'Family Engagement Specialist',
    'Grantee Specialist',
    'Health Specialist',
    'System Specialist',
  ];

  // is our role amongst them?
  if (!acceptableRoles.includes(role)) {
    return ''; // if not, then no string
  }

  // finally, escape output using built in sequelize function
  return sequelize.escape(role);
}

export function withRole(roles) {
  const rolesString = roles.map((role) => escapeRole(role)).join(',');

  // we shan't pass sequelize an empty array
  if (!rolesString) {
    return {};
  }

  return {
    [Op.or]: [
      sequelize.literal(`SELECT ARRAY((SELECT unnest("role") FROM "Users" where "ActivityReport"."userId" = "Users"."id"))::text[] && ARRAY[${rolesString}]`),
      sequelize.literal(` (SELECT ARRAY ((SELECT unnest("role") FROM "Users" INNER JOIN "ActivityReportCollaborators" ON "Users"."id" = "ActivityReportCollaborators"."userId" AND "ActivityReport"."id" = "ActivityReportCollaborators"."activityReportId"))::text[] && ARRAY[${rolesString}])`),
    ],
  };
}

export function withoutRole(roles) {
  const rolesString = roles.map((role) => escapeRole(role)).join(',');

  // we shan't pass sequelize an empty array
  if (!rolesString) {
    return {};
  }

  return {
    [Op.not]: [
      sequelize.literal(`(SELECT ARRAY((SELECT unnest("role") FROM "Users" where "ActivityReport"."userId" = "Users"."id"))::text[] && ARRAY[${rolesString}]) OR  (SELECT ARRAY ((SELECT unnest("role") FROM "Users" INNER JOIN "ActivityReportCollaborators" ON "Users"."id" = "ActivityReportCollaborators"."userId" AND "ActivityReport"."id" = "ActivityReportCollaborators"."activityReportId"))::text[] && ARRAY[${rolesString}])`),
    ],
  };
}
