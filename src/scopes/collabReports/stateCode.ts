import { Op } from 'sequelize';
import { sequelize } from '../../models';

const stateCodeScope = (query: string[], exclude = false) => {
  const normalized = query
    .flatMap((s) => s.split(',').map((item) => item.trim()))
    .filter((s) => s.length > 0);

  if (!normalized.length) {
    return {};
  }

  const escaped = normalized.map((code) => sequelize.escape(code));
  const operator = exclude ? Op.notIn : Op.in;

  return {
    id: {
      [operator]: sequelize.literal(`(
        SELECT cras."collabReportId"
        FROM "CollabReportActivityStates" cras
        WHERE cras."deletedAt" IS NULL
          AND cras."activityStateCode" IN (${escaped.join(', ')})
      )`),
    },
  };
};

export const withStateCode = (query: string[]) => stateCodeScope(query);

export const withoutStateCode = (query: string[]) => stateCodeScope(query, true);
