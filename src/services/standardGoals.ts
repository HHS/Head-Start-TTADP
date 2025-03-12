import { Op } from 'sequelize';
import { GOAL_STATUS } from '../constants';
import db from '../models';

const {
  GoalTemplate,
  GoalTemplateFieldPrompt,
  GoalFieldResponse,
  Goal,
  Grant,
  Objective,
  Program,
} = db;

interface IObjective {
  title: string;
  objectiveTemplateId?: number;
}

/**
 * This returns a standard goal. If we are "restarting a standard goal"
 * (i.e. the goal has been closed), we can adjust the status parameter to include 'CLOSED'
 * to get the previous objectives, etc
 *
 * @param grantId
 * @param goalTemplateId
 * @param status
 * @returns {object} Goal
 * @return {object} Goal.objectives
 * @return {object} Goal.responses
 *
 */
export async function goalForRtr(
  grantId: number,
  goalTemplateId: number,
  status: string[] = [
    GOAL_STATUS.NOT_STARTED,
    GOAL_STATUS.IN_PROGRESS,
  ],
) {
  return Goal.findOne({
    where: {
      grantId,
      goalTemplateId,
      status: {
        [Op.in]: status,
      },
    },
    attributes: [
      'id',
      'name',
      'status',
      'goalTemplateId',
      'grantId',
    ],
    include: [
      {
        model: Grant,
        as: 'grant',
        attributes: [
          'numberWithProgramTypes',
          'id',
          'number',
        ],
        include: [
          {
            model: Program,
            as: 'programs',
            attributes: [
              'grantId',
              'programType',
            ],
          },
        ],
      },
      {
        attributes: [
          'id',
          'title',
          'onAR',
          'status',
          'objectiveTemplateId',
        ],
        model: Objective,
        as: 'objectives',
      },
      {
        model: GoalFieldResponse,
        as: 'responses',
        attributes: [
          'id',
          'goalId',
          'response',
        ],
      }],
  });
}

export async function getStardard(
  standardGoalId: number,
  grantId: number,
  rootCauses?: Array<string>,
) {
  // Get the curated template with goal usage
  const standard = await GoalTemplate.findByPk(standardGoalId, {
    include: [
      {
        model: Goal,
        as: 'goals',
        where: {
          grantId,
          status: [
            GOAL_STATUS.NOT_STARTED,
            GOAL_STATUS.IN_PROGRESS,
          ],
        },
        required: false,
      },
      {
        model: GoalTemplateFieldPrompt,
        as: 'prompts',
        required: false,
      },
    ],
  });

  if (!standard) {
    throw new Error('Standard goal not found');
  }

  const { prompts } = standard;
  const requiresPrompts = prompts && prompts.length > 0;

  // as above, if we ever need to add more prompt responses, we will need to make this generic
  // (for the past few years, we've only had root causes,
  // and have been told that is all we should expect)
  if (requiresPrompts && !rootCauses) {
    throw new Error('Root causes are required for this goal');
  }

  return { standard, requiresPrompts };
}

// This function will handle
// - creating a new standard goal
// - based on the design, this will not unsuspend or "restart" a closed goal
// - creating new objectives if appropriate
// - This will also serve to restart a standard goal (that has been closed)
export async function newStandardGoal(
  grantId: number,
  standardGoalId: number,
  objectives?: Array<IObjective>,
  // todo: if we ever add more prompt responses, we will need to make this next param generic
  rootCauses?: Array<string>,
) {
  const { standard, requiresPrompts } = await getStardard(standardGoalId, grantId, rootCauses);

  if (standard.goals.length > 0) {
    throw new Error('Standard goal has already been utilized');
  }

  const newGoal = await Goal.create({
    status: GOAL_STATUS.NOT_STARTED,
    name: standard.templateName,
    grantId,
    goalTemplateId: standard.id,
    createdVia: 'rtr',
  });

  // a new goal does not require objectives, but may include them
  if (objectives && objectives.length) {
    await Objective.bulkCreate(objectives.map((objective) => ({
      ...objective,
      createdVia: 'rtr',
      status: GOAL_STATUS.NOT_STARTED,
      goalId: newGoal.id,
    })));
  }

  const { prompts } = standard;

  if (requiresPrompts) {
    await GoalFieldResponse.create({
      goalId: newGoal.id,
      // again, we only foresee one possible prompt right now
      goalTemplateFieldPromptId: prompts[0].id,
      response: rootCauses,
    });
  }

  return goalForRtr(
    grantId,
    standardGoalId,
  );
}

// This function will handle
// - editing a standard goal
//
export async function updateExistingStandardGoal(
  grantId: number,
  standardGoalId: number,
  objectives: Array<IObjective>, // expect objectiveTemplateId here
  rootCauses?: Array<string>,
) {
  const { standard, requiresPrompts } = await getStardard(standardGoalId, grantId, rootCauses);

  if (standard.goals.length !== 1) {
    throw new Error('Grant has not utilized this standard goal, or has more than one active standard goal');
  }

  const [goal] = standard.goals;
  const { prompts } = standard;

  // a new goal does not require objectives, but may include them
  if (objectives.length) {
    await Promise.all(objectives.map(async (objective) => {
      if (objective.objectiveTemplateId) {
        const existingObjective = await Objective.findOne({
          where: {
            goalId: goal.id,
            objectiveTemplateId: objective.objectiveTemplateId,
          },
        });

        if (existingObjective) {
          return existingObjective.update({
            title: objective.title,
          });
        }
      }
      return Objective.create({
        title: objective.title,
        createdVia: 'rtr',
        status: GOAL_STATUS.NOT_STARTED,
        goalId: goal.id,
      });
    }));
  }

  if (requiresPrompts) {
    const existingResponse = await GoalFieldResponse.findOne({
      where: {
        goalId: goal.id,
        goalTemplateFieldPromptId: prompts[0].id,
      },
    });

    if (existingResponse) {
      await existingResponse.update({
        response: rootCauses,
      });
    } else {
      await GoalFieldResponse.create({
        goalId: goal.id,
        goalTemplateFieldPromptId: prompts[0].id,
        response: rootCauses,
      });
    }
  }

  return goalForRtr(
    grantId,
    standardGoalId,
  );
}
