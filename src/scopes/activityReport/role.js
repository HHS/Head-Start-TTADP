import { Op } from 'sequelize';
import { sequelize } from '../../models';

function userQuery(escapedRoles) {
  return `
  SELECT
    "ActivityReports"."id"
  FROM "Users" "Users"  
  INNER JOIN "ActivityReports" "ActivityReports"
  ON "ActivityReports"."userId" = "Users"."id"
  INNER JOIN "UserRoles" "UserRoles"
  ON "UserRoles"."userId" = "Users"."id"
  INNER JOIN "Roles" "Roles"
  ON "Roles"."id" = "UserRoles"."roleId"
  WHERE "Roles"."fullName" IN (${escapedRoles})`;
}

function collaboratorQuery(escapedRoles) {
  return `
  SELECT
    "ActivityReportCollaborators"."activityReportId"
  FROM "Users" "Users"
  INNER JOIN "ActivityReportCollaborators" "ActivityReportCollaborators"
  ON "ActivityReportCollaborators"."userId" = "Users"."id"
  INNER JOIN "UserRoles" "UserRoles"
  ON "UserRoles"."userId" = "Users"."id"
  INNER JOIN "Roles" "Roles"
  ON "Roles"."id" = "UserRoles"."roleId"
  WHERE "Roles"."fullName" IN (${escapedRoles})`;
}

function generateWhere(escapedSearchTerms, exclude) {
  const userSubQuery = userQuery(escapedSearchTerms);
  const collaboratorSubQuery = collaboratorQuery(escapedSearchTerms);

  if (exclude) {
    return {
      [Op.and]: [
        sequelize.literal(`("ActivityReport"."id" NOT IN (${userSubQuery}))`),
        sequelize.literal(`("ActivityReport"."id" NOT IN (${collaboratorSubQuery}))`),
      ],
    };
  }

  return {
    [Op.or]: [
      sequelize.literal(`("ActivityReport"."id" IN (${userSubQuery}))`),
      sequelize.literal(`("ActivityReport"."id" IN (${collaboratorSubQuery}))`),
    ],
  };
}

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
  // filter removes empty strings
  const acceptableRoles = roles.map((role) => escapeRole(role)).filter((role) => role);

  // we shan't pass sequelize an empty array
  if (acceptableRoles.length === 0) {
    return {};
  }

  return generateWhere(acceptableRoles, false);
}

export function withoutRole(roles) {
  // filter removes empty strings
  const acceptableRoles = roles.map((role) => escapeRole(role)).filter((role) => role);

  // we shan't pass sequelize an empty array
  if (acceptableRoles.length === 0) {
    return {};
  }

  return generateWhere(acceptableRoles, true);
}
