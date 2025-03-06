import db from '../models';

const { GoalTemplate, Goal, Objective } = db;

export async function standardGoalsForGrant(
  grantId: number,
  standardGoals: Array<{
    id: number,
    objectives: Array<{ id: number }>,
    rootCauses?: Array<string>,
  }>,
) {

}

export async function useStandardGoals(
  grantId: number,
  standardGoals: Array<{
    id: number,
    objectives: Array<{ id: number }>,
    rootCauses?: Array<string>,
  }>,
) {

}
