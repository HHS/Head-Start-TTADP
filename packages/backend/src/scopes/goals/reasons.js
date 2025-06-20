import { Op } from 'sequelize';
import { filterAssociation } from './utils';
import { sequelize } from '../../models';

const reasonFilter = (options) => {
  const useRecipient = options && options.recipientId;
  return `
          SELECT DISTINCT g.id
          FROM "ActivityReports" ar
          INNER JOIN "ActivityReportGoals" arg ON ar.id = arg."activityReportId"
          INNER JOIN "Goals" g ON arg."goalId" = g.id
          INNER JOIN "Grants" gr ON g."grantId" = gr."id"
          WHERE ${useRecipient ? `gr."recipientId" = ${sequelize.escape(options.recipientId)} AND ` : ''}
          ARRAY_TO_STRING(ar."reason", ',')`;
};

export function withReasons(reasons, options) {
  return {
    [Op.or]: [
      filterAssociation(reasonFilter(options), reasons, false),
    ],
  };
}

export function withoutReasons(reasons, options) {
  return {
    [Op.and]: [
      filterAssociation(reasonFilter(options), reasons, true),
    ],
  };
}
