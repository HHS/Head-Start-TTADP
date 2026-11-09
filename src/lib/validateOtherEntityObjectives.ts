import parsePositiveInteger from './parsePositiveInteger';

interface OtherEntityObjectivePayload {
  recipientIds?: unknown;
  goalId?: unknown;
  goalIds?: unknown;
}

const isSet = (value: unknown) => value !== undefined && value !== null;

/**
 * Other entity objectives are never attached to a goal. A payload that names a goal, or lists an
 * entity id that is not a positive integer (for example null), could otherwise match grant backed
 * objectives in any region, so such payloads are rejected before anything is written.
 */
export default function validateOtherEntityObjectives(objectives: unknown): boolean {
  if (!Array.isArray(objectives)) return false;

  return objectives.every((objective: OtherEntityObjectivePayload) => {
    if (!objective || typeof objective !== 'object') return false;

    const { recipientIds, goalId, goalIds } = objective;
    return (
      Array.isArray(recipientIds) &&
      recipientIds.every((id) => typeof id === 'number' && parsePositiveInteger(id) !== null) &&
      !isSet(goalId) &&
      !isSet(goalIds)
    );
  });
}
