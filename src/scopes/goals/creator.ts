import { Op } from 'sequelize';
import { sequelize } from '../../models';
import { filterAssociation } from './utils';

const creatorSubQuery = `
  SELECT gc."goalId"
  FROM "GoalCollaborators" gc
  INNER JOIN "CollaboratorTypes" ct ON ct.id = gc."collaboratorTypeId"
  INNER JOIN "Users" u ON u.id = gc."userId"
  WHERE ct.name = 'Creator' AND u.name`;

const notMonitoring = sequelize.literal(`"Goal"."createdVia" != 'monitoring'`);

export function withCreator(names: string[]) {
  const result = filterAssociation(creatorSubQuery, names, false);
  return {
    where: {
      [Op.and]: [
        result.where,
        notMonitoring,
      ],
    },
  };
}

export function withoutCreator(names: string[]) {
  const result = filterAssociation(creatorSubQuery, names, true);
  return {
    where: {
      [Op.and]: [
        result.where,
        notMonitoring,
      ],
    },
  };
}
