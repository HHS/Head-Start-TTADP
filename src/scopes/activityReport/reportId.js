import { Op } from 'sequelize';
import { sequelize } from '../../models';

export const reportIdStr = 'CONCAT(\'R\', LPAD("ActivityReport"."regionId"::text, 2, \'0\'), \'-AR-\', "ActivityReport".id)';

const reportIdScope = (ids, exclude = false) => {
  const operator = exclude ? '!~*' : '~*';
  const combiner = exclude ? Op.and : Op.or;
  const separator = exclude ? '|' : '&';
  const nullLegacy = exclude ? 'OR "legacyId" IS NULL' : '';

  const escapedIds = sequelize.escape(ids.join(separator));
  const nonLegacyCondition = sequelize.literal(`${reportIdStr} ${operator} ${escapedIds}`);
  const legacyCondition = sequelize.literal(`("legacyId" ${operator} ${escapedIds} ${nullLegacy})`);
  return {
    [combiner]: [
      nonLegacyCondition,
      legacyCondition,
    ],
  };
};

export function withReportIds(ids) {
  return reportIdScope(ids);
}

export function withoutReportIds(ids) {
  return reportIdScope(ids, true);
}
