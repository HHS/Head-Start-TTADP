import { Op } from 'sequelize';
import { sequelize } from '../../models';

const VALID_REASON_IDS = new Set([
  'participate_work_groups',
  'support_coordination',
  'agg_regional_data',
  'develop_presentations',
]);

const normalizeReasonIds = (query: string[]) =>
  query
    .flatMap((item) => item.split(',').map((r) => r.trim()))
    .filter((r) => VALID_REASON_IDS.has(r));

const activityPurposeScope = (query: string[], exclude = false) => {
  const reasonIds = normalizeReasonIds(query);
  if (!reasonIds.length) {
    return {};
  }

  const escapedIds = reasonIds.map((id) => sequelize.escape(id));
  const operator = exclude ? Op.notIn : Op.in;

  return {
    id: {
      [operator]: sequelize.literal(`(
        SELECT crr."collabReportId"
        FROM "CollabReportReasons" crr
        WHERE crr."deletedAt" IS NULL
          AND crr."reasonId" IN (${escapedIds.join(', ')})
      )`),
    },
  };
};

export const withActivityPurpose = (query: string[]) => activityPurposeScope(query);

export const withoutActivityPurpose = (query: string[]) => activityPurposeScope(query, true);
