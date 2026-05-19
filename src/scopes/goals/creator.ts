import { filterAssociation } from './utils';

const creatorSubQuery = `
  SELECT gc."goalId"
  FROM "GoalCollaborators" gc
  INNER JOIN "CollaboratorTypes" ct ON ct.id = gc."collaboratorTypeId"
  INNER JOIN "Users" u ON u.id = gc."userId"
  WHERE ct.name = 'Creator' AND u.name`;

export function withCreator(names: string[]) {
  return filterAssociation(creatorSubQuery, names, false);
}

export function withoutCreator(names: string[]) {
  return filterAssociation(creatorSubQuery, names, true);
}
