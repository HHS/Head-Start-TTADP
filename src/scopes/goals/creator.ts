import { Op } from 'sequelize';
import { sequelize } from '../../models';
import { filterAssociation } from './utils';

const creatorSubQuery = `
  SELECT gc."goalId"
  FROM "GoalCollaborators" gc
  INNER JOIN "CollaboratorTypes" ct ON ct.id = gc."collaboratorTypeId"
  INNER JOIN "Users" u ON u.id = gc."userId"
  WHERE ct.name = 'Creator' AND u.name`;

const notMonitoringSubQuery = `
  SELECT g."id"
  FROM "Goals" g
  INNER JOIN "GoalTemplates" gt ON g."goalTemplateId" = gt."id"
  WHERE gt."standard" = 'Monitoring'`;

export function withCreator(names: string[]) {
  const result = filterAssociation(creatorSubQuery, names, false);
  return {
    where: {
      [Op.and]: [
        result.where,
        sequelize.literal(`"Goal"."id" NOT IN (${notMonitoringSubQuery})`),
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
        sequelize.literal(`"Goal"."id" NOT IN (${notMonitoringSubQuery})`),
      ],
    },
  };
}
