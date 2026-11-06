import parsePositiveInteger from '../lib/parsePositiveInteger';
import db from '../models';
import GoalPolicy from '../policies/goals';

interface GrantRegion {
  id: number;
  regionId: number;
  recipientId: number;
}

interface GoalTarget {
  grantId?: unknown;
  grantIds?: unknown;
  regionId?: unknown;
  recipientId?: unknown;
}

/**
 * Authorize every grant targeted by a goal write before the write service runs.
 * For activity-report goals, all selected grants must belong to the report's region.
 */
export default async function canWriteGoals(
  user: { permissions?: { regionId: number; scopeId: number }[] },
  goals: unknown,
  reportRegionId?: number
): Promise<boolean> {
  if (!Array.isArray(goals) || goals.some((goal) => !goal || typeof goal !== 'object')) {
    return false;
  }

  const targets = goals.flatMap((goal: GoalTarget) => {
    // Report goals without grants are ignored by saveStandardGoalsForReport.
    const grantIds = reportRegionId === undefined ? [goal.grantId] : (goal.grantIds ?? []);
    if (!Array.isArray(grantIds)) return [{ goal, grantId: null }];
    return grantIds.map((id) => ({ goal, grantId: parsePositiveInteger(id) }));
  });

  if (targets.some(({ grantId }) => grantId === null)) return false;
  if (!targets.length) return true;

  const grantIds = [...new Set(targets.map(({ grantId }) => grantId))];
  const grants = (await db.Grant.findAll({
    attributes: ['id', 'regionId', 'recipientId'],
    where: { id: grantIds },
  })) as GrantRegion[];
  const grantsById = new Map(grants.map((grant) => [grant.id, grant]));

  return targets.every(({ goal, grantId }) => {
    const grant = grantsById.get(grantId as number);
    if (!grant) return false;

    // Report goals may group grants for multiple recipients; recipientId is display metadata.
    const recipientMatches =
      reportRegionId !== undefined ||
      goal.recipientId === undefined ||
      parsePositiveInteger(goal.recipientId) === grant.recipientId;

    return (
      (reportRegionId === undefined || grant.regionId === reportRegionId) &&
      (goal.regionId === undefined || parsePositiveInteger(goal.regionId) === grant.regionId) &&
      recipientMatches &&
      new GoalPolicy(user, null, grant.regionId).canCreate()
    );
  });
}
