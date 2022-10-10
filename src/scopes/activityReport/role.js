import { Op } from 'sequelize';
import { sequelize } from '../../models';
import { ENTITY_TYPES, COLLABORATOR_TYPES } from '../../constants';

function userQuery(escapedRoles) {
  return `
  SELECT
    "Collaborators"."entityId"
  FROM "Users" "Users"
  INNER JOIN "Collaborators" "Collaborators"
  ON "Collaborators"."userId" = "Users"."id"
  AND '${COLLABORATOR_TYPES.OWNER}' = ANY ("Collaborators"."collaboratorTypes")
  AND "Collaborators"."entityType" = '${ENTITY_TYPES.REPORT}'
  INNER JOIN "UserRoles" "UserRoles"
  ON "UserRoles"."userId" = "Users"."id"
  INNER JOIN "Roles" "Roles"
  ON "Roles"."id" = "UserRoles"."roleId"
  WHERE "Roles"."fullName" IN (${escapedRoles})`;
}

function collaboratorQuery(escapedRoles) {
  return `
  SELECT
    "Collaborators"."entityId"
  FROM "Users" "Users"
  INNER JOIN "Collaborators" "Collaborators"
  ON "Collaborators"."userId" = "Users"."id"
  AND '${COLLABORATOR_TYPES.EDITOR}' = ANY ("Collaborators"."collaboratorTypes")
  AND "Collaborators"."entityType" = '${ENTITY_TYPES.REPORT}'
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
  // TODO: could this filtering be done using the "isSpecialist" column in the db?
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
