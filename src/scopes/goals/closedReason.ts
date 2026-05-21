import { GOAL_STATUS } from '@ttahub/common';
import { Op } from 'sequelize';
import { filterAssociation } from './utils';

const closedReasonSubQuery = `
  SELECT gsc."goalId"
  FROM "GoalStatusChanges" gsc
  INNER JOIN "Goals" g ON g."id" = gsc."goalId"
  WHERE gsc."newStatus" = '${GOAL_STATUS.CLOSED}'
    AND g."status" = '${GOAL_STATUS.CLOSED}'
    AND NOT EXISTS (
      SELECT 1
      FROM "GoalStatusChanges" latestGsc
      WHERE latestGsc."goalId" = gsc."goalId"
        AND latestGsc."newStatus" = '${GOAL_STATUS.CLOSED}'
        AND (
          COALESCE(latestGsc."performedAt", latestGsc."createdAt")
            > COALESCE(gsc."performedAt", gsc."createdAt")
          OR (
            COALESCE(latestGsc."performedAt", latestGsc."createdAt")
              = COALESCE(gsc."performedAt", gsc."createdAt")
            AND latestGsc."id" > gsc."id"
          )
        )
    )
    AND gsc."reason"`;

export function withClosedReason(reasons: string[]) {
  return filterAssociation(closedReasonSubQuery, reasons, false);
}

export function withoutClosedReason(reasons: string[]) {
  const result = filterAssociation(closedReasonSubQuery, reasons, true);
  return {
    [Op.and]: [
      { status: GOAL_STATUS.CLOSED },
      result.where,
    ],
  };
}
