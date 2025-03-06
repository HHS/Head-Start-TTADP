import db from '../models';

const {
  GoalTemplate,
  GoalTemplateFieldPrompt,
  GoalFieldResponse,
  Goal,
  Objective,
} = db;

interface IObjective {
  id: number;
  title: string;
}

// This function will handle
// - creating a new standard goal
// - "reopen" a standard goal
// - "unsuspend" a standard goal
// - creating new objectives if appropriate
//
export async function newStandardGoal(
  grantId: number,
  standardGoalId: number,
  objectives: Array<IObjective>,
  rootCauses?: Array<string>,
) {
  //
  // 1. Get the curated template with goal usage
  //

  const standard = await GoalTemplate.findOne(standardGoalId, {
    include: [
      {
        model: Goal,
        as: 'goals',
        where: {
          grantId,
        },
        include: [{
          model: Objective,
          as: 'objectives',
        }, {
          model: GoalFieldResponse,
          as: 'responses',
        }],
      },
      {
        model: GoalTemplateFieldPrompt,
        as: 'prompts',
      },
    ],
  });

  // todo; other stuff

  return standard;
}

// This function will handle
// - editing a standard goal
//
export async function updateStandardGoal(
  grantId: number,
  standardGoalId: number,
  objectives: Array<IObjective>,
  rootCauses?: Array<string>,
) {
  //
  // 1. Get the curated template with goal usage
  //

  const standard = await GoalTemplate.findOne(standardGoalId, {
    include: [
      {
        model: Goal,
        as: 'goals',
        where: {
          grantId,
        },
        include: [{
          model: Objective,
          as: 'objectives',
        }, {
          model: GoalFieldResponse,
          as: 'responses',
        }],
      },
      {
        model: GoalTemplateFieldPrompt,
        as: 'prompts',
      },
    ],
  });

  // todo; other stuff

  return standard;
}
