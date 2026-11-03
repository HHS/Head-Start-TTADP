import parsePositiveInteger from '../lib/parsePositiveInteger';
import db from '../models';
import GoalPolicy from '../policies/goals';

interface GrantRegion {
  id: number;
  regionId: number;
  recipientId: number;
}

/** Authorize every grant before a batch can perform any writes. */
export default async function canWriteGoals(user, goals, reportRegionId?: number) {
  if (!Array.isArray(goals) || goals.some((goal) => !goal)) return false;

  const targets = goals.flatMap((goal) => {
    // Report goals without grants are ignored by saveStandardGoalsForReport.
    const grantIds = reportRegionId === undefined ? [goal.grantId] : (goal.grantIds ?? []);
    if (!Array.isArray(grantIds)) return [{ goal, grantId: null }];
    return grantIds.map((id) => ({ goal, grantId: parsePositiveInteger(id) }));
  });
  if (targets.some(({ grantId }) => grantId === null)) return false;
  if (!targets.length) return true;

  const grants = await db.Grant.findAll({
    attributes: ['id', 'regionId', 'recipientId'],
    where: { id: [...new Set(targets.map(({ grantId }) => grantId))] },
  });
  const grantsById = new Map<number, GrantRegion>(grants.map((grant) => [grant.id, grant]));

  return targets.every(({ goal, grantId }) => {
    const grant = grantsById.get(grantId);
    return (
      grant &&
      (reportRegionId === undefined || grant.regionId === reportRegionId) &&
      (goal.regionId === undefined || parsePositiveInteger(goal.regionId) === grant.regionId) &&
      // A report goal can group grants for multiple recipients; its single
      // recipientId is display metadata. RTR goals belong to one recipient.
      (reportRegionId !== undefined ||
        goal.recipientId === undefined ||
        parsePositiveInteger(goal.recipientId) === grant.recipientId) &&
      new GoalPolicy(user, null, grant.regionId).canCreate()
    );
  });
}
