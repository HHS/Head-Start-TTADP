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
  return filterAssociation(closedReasonSubQuery, reasons, true);
}
