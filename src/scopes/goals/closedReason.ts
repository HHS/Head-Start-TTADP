import { Op } from 'sequelize';
import { filterAssociation } from './utils';

const closedReasonSubQuery = `
  SELECT gsc."goalId"
  FROM "GoalStatusChanges" gsc
  INNER JOIN "Goals" g ON g."id" = gsc."goalId"
  WHERE gsc."newStatus" = 'Closed' AND g."status" = 'Closed' AND gsc."reason"`;

export function withClosedReason(reasons: string[]) {
  return filterAssociation(closedReasonSubQuery, reasons, false);
}

export function withoutClosedReason(reasons: string[]) {
  const result = filterAssociation(closedReasonSubQuery, reasons, true);
  return {
    [Op.and]: [
      { status: 'Closed' },
      result.where,
    ],
  };
}
