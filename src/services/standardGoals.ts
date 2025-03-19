import { Op } from 'sequelize';
import { REPORT_STATUSES } from '@ttahub/common';
import { CREATION_METHOD, GOAL_STATUS } from '../constants';
import db from '../models';
import orderGoalsBy from '../lib/orderGoalsBy';
import filtersToScopes from '../scopes';
import goalStatusByGoalName from '../widgets/goalStatusByGoalName';
import changeGoalStatus from '../goalServices/changeGoalStatus';
import { setFieldPromptsForCuratedTemplate } from './goalTemplates';
import { cacheGoalMetadata } from './reportCache';

const GOALS_PER_PAGE = 10;

const {
  sequelize,
  GoalTemplate,
  GoalTemplateFieldPrompt,
  GoalFieldResponse,
  Goal,
  Grant,
  Objective,
  Program,
  ActivityReport,
  ActivityReportObjective,
  ActivityReportObjectiveCitation,
  Topic,
  GoalStatusChange,
  User,
  UserRole,
  Role,
  CollaboratorType,
  GoalCollaborator,
} = db;

interface IObjective {
  id?: number;
  title: string;
  objectiveTemplateId?: number;
}

/** *
 * This function will save the standard goals for a report.
 * We still save for each recipient.
 * But we now have special logic for when to re-use va create a new goal.
 *  - Not Used: Grant gets the goal and moved to 'Not Started status,
 *   until report is approved then 'In progress'.
 *  - Not Started: Existing goal moves to 'In progress'.
 *  - In progress: Existing goal gets new objectives.
 *  - Suspended: Existing goal moves to 'In progress'.
 *  - Closed: Goal is restarted and moves to 'In progress' (restarted = create a new goal).
 * Objectives will save exactly as they did before.
*
 * @param goals
 * @returns {object} Goal
 * @return {object} Goal.objectives
 */
export async function saveStandardGoalsForReport(goals, userId, report) {
  // Loop goal templates.
  const updatedGoals = await Promise.all(goals.map(async (goal) =>
    // Loops recipients update / create goals.
    // eslint-disable-next-line implicit-arrow-linebreak
    Promise.all(goal.grantIds.map(async (grantId) => {
      // Check if there is an existing goal for this template and grant.
      let newOrUpdatedGoal = await Goal.findOne({
        where: {
          grantId,
          goalTemplateId: goal.goalTemplateId,
        },
        include: [
          {
            model: Objective,
            as: 'objectives',
            attributes: ['id', 'title', 'status'],
          },
          {
            model: GoalFieldResponse,
            as: 'responses',
            attributes: ['response'],
          },
        ],
      });

      // If this is a monitoring goal check for existing goal.
      if (goal.goalTemplate.standard === 'Monitoring' && !newOrUpdatedGoal) {
        // No monitoring goal for this grant skip.
        return null;
      }

      if (newOrUpdatedGoal) {
        // If the goal is 'Not started' move to 'In progress'.
        if (newOrUpdatedGoal.status === GOAL_STATUS.NOT_STARTED) {
          await changeGoalStatus({
            goalId: newOrUpdatedGoal.id,
            userId,
            newStatus: GOAL_STATUS.IN_PROGRESS,
            reason: 'Goal moved to In Progress from Not Started',
            context: 'saveStandardGoalsForReport',
          });
        } else if (newOrUpdatedGoal.status === GOAL_STATUS.SUSPENDED) {
          // If the goal is 'Suspended' move to 'In progress'.
          await changeGoalStatus({
            goalId: newOrUpdatedGoal.id,
            userId,
            newStatus: GOAL_STATUS.IN_PROGRESS,
            reason: 'Goal moved to In Progress from Suspended',
            context: 'saveStandardGoalsForReport',
          });
        } else if (newOrUpdatedGoal.status === GOAL_STATUS.CLOSED) {
          // If the goal is 'Closed' create a new goal.
          newOrUpdatedGoal = null;
        }
      }

      // If there is no existing goal, or its closed, create a new one in 'Not started'.
      if (!newOrUpdatedGoal) {
        newOrUpdatedGoal = await Goal.create({
          goalTemplateId: goal.goalTemplateId,
          createdVia: 'activityReport',
          name: goal.name ? goal.name.trim() : '',
          grantId,
          GOAL_STATUS: GOAL_STATUS.NOT_STARTED,
        }, { individualHooks: true });
      }

      // Handle goal prompts for curated goals like FEI.
      if (goal.goalTemplate.creationMethod === CREATION_METHOD.CURATED && goal.prompts) {
        await setFieldPromptsForCuratedTemplate([newOrUpdatedGoal.id], goal.prompts);
      }

      // Save goal meta data.
      await cacheGoalMetadata(
        newOrUpdatedGoal,
        report.id,
        false, // The only path that actively being edited is set is from AR.
        goal.prompts,
      );

      return newOrUpdatedGoal;
    }))));
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
      status,
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
    const updatedObjectives = await Promise.all(objectives.map(async (objective) => {
      if (objective.objectiveTemplateId) {
        const orOptions = [
          { title: objective.title },
        ] as {
          id?: number;
          title?: string;
        }[];

        if (objective.id) {
          orOptions.push({ id: objective.id });
        }

        const existingObjective = await Objective.findOne({
          where: {
            goalId: goal.id,
            [Op.or]: orOptions,
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

    await Objective.destroy({
      where: {
        goalId: goal.id,
        id: {
          [Op.notIn]: updatedObjectives.map((o) => o.id),
        },
      },
    });
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

export async function standardGoalsForRecipient(
  recipientId: number,
  regionId: number,
  {
    sortBy = 'goalStatus',
    sortDir = 'desc',
    offset = 0,
    limit = GOALS_PER_PAGE,
    goalIds = [],
    ...filters
  },
) {
  const { goal: scopes } = await filtersToScopes(filters, {});

  const goals = await Goal.findAll({
    attributes: ['id'],
    where: {
      [Op.and]: [
        ...scopes,
        sequelize.where(
          sequelize.col('Goal.id'),
          'IN',
          sequelize.literal(`(
            SELECT MAX(g2.id)
            FROM "Goals" g2
            INNER JOIN "Grants" gr2 ON g2."grantId" = gr2.id
            INNER JOIN "GoalTemplates" gt2 ON g2."goalTemplateId" = gt2.id
            WHERE gr2."recipientId" = ${recipientId}
            AND gr2."regionId" = ${regionId}
            GROUP BY g2."goalTemplateId", g2."grantId"
          )`),
        ),
      ],
    },
    include: [
      {
        model: GoalTemplate,
        as: 'goalTemplate',
        attributes: [],
        required: true,
        where: {
          creationMethod: CREATION_METHOD.CURATED,
        },
      },
    ],
  });

  const ids = goals.map((g: { id: number }) => g.id);

  const rows = await Goal.findAll({
    attributes: [
      'id',
      'name',
      'status',
      'createdAt',
      [sequelize.literal(`
        CASE
          WHEN COALESCE("Goal"."status",'')  = '' OR "Goal"."status" = 'Needs Status' THEN 1
          WHEN "Goal"."status" = 'Draft' THEN 2
          WHEN "Goal"."status" = 'Not Started' THEN 3
          WHEN "Goal"."status" = 'In Progress' THEN 4
          WHEN "Goal"."status" = 'Closed' THEN 5
          WHEN "Goal"."status" = 'Suspended' THEN 6
          ELSE 7 END`),
      'status_sort'],
    ],
    where: {
      id: ids,
    },
    include: [
      {
        model: GoalStatusChange,
        as: 'statusChanges',
        attributes: ['oldStatus', 'newStatus'],
        required: false,
      },
      {
        model: GoalCollaborator,
        as: 'goalCollaborators',
        attributes: [],
        separate: true,
        required: false,
        include: [
          {
            model: CollaboratorType,
            as: 'collaboratorType',
            required: true,
            where: {
              name: 'Creator',
            },
            attributes: ['name'],
          },
          {
            model: User,
            as: 'user',
            attributes: ['name'],
            required: true,
            include: [
              {
                model: UserRole,
                as: 'userRoles',
                required: true,
                include: [
                  {
                    model: Role,
                    as: 'role',
                    attributes: ['name'],
                    required: true,
                  },
                ],
                attributes: [],
              },
            ],
          },
        ],
      },
      {
        model: GoalFieldResponse,
        as: 'responses',
        required: false,
        attributes: ['response', 'goalId'],
      },
      {
        required: true,
        model: Grant,
        as: 'grant',
        attributes: [
          'id',
          'recipientId',
          'regionId',
          'number',
        ],
        where: {
          regionId,
          recipientId,
        },
      },
      {
        attributes: [
          'id',
          'title',
          'status',
          'goalId',
          'onApprovedAR',
        ],
        model: Objective,
        as: 'objectives',
        required: false,
        separate: true,
        order: [
          [sequelize.col('activityReportObjectives.activityReport.endDate'), 'DESC'],
          ['createdAt', 'DESC'],
        ],
        include: [
          {
            model: ActivityReportObjective,
            as: 'activityReportObjectives',
            attributes: ['id', 'objectiveId'],
            required: false,
            include: [
              {
                attributes: [
                  'id',
                  'startDate',
                  'endDate',
                  'calculatedStatus',
                  'regionId',
                  'displayId',
                ],
                model: ActivityReport,
                as: 'activityReport',
                required: false,
                where: {
                  calculatedStatus: REPORT_STATUSES.APPROVED,
                },
              },
              {
                model: Topic,
                as: 'topics',
                attributes: ['name'],
                required: false,
              },
              {
                model: ActivityReportObjectiveCitation,
                as: 'activityReportObjectiveCitations',
                attributes: [
                  'citation',
                  'monitoringReferences',
                ],
                required: false,
              },
            ],
          },
        ],
      },
    ],
    order: orderGoalsBy(sortBy, sortDir),
  });

  const statuses = await goalStatusByGoalName({
    goal: {
      id: ids,
    },
  });

  return {
    count: rows.length,
    goalRows: rows,
    statuses,
    allGoalIds: ids,
  };
}
