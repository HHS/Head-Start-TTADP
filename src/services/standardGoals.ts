import { Op } from 'sequelize';
import { uniqBy } from 'lodash';
import { REPORT_STATUSES } from '@ttahub/common';
import { CREATION_METHOD, GOAL_STATUS, OBJECTIVE_STATUS } from '../constants';
import db from '../models';
import orderGoalsBy from '../lib/orderGoalsBy';
import filtersToScopes from '../scopes';
import { reduceObjectivesForRecipientRecord } from './recipient';
import { setFieldPromptsForCuratedTemplate } from './goalTemplates';
import { cacheGoalMetadata, cacheObjectiveMetadata, destroyActivityReportObjectiveMetadata } from './reportCache';

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
  ActivityReportGoal,
  ActivityReportObjective,
  ActivityReportObjectiveCitation,
  Topic,
  GoalStatusChange,
  User,
  Role,
} = db;

interface IObjective {
  id?: number;
  title: string;
  objectiveTemplateId?: number;
}

export async function removeObjectivesFromReport(objectivesToRemove, reportId) {
  if (!objectivesToRemove.length) {
    return Promise.resolve();
  }

  // TODO - when we have an "onAnyReport" flag, we can use that here instead of two SQL statements
  const objectivesToPossiblyDestroy = await Objective.findAll({
    where: {
      createdVia: 'activityReport',
      id: objectivesToRemove,
      onApprovedAR: false,
    },
    include: [
      {
        model: ActivityReport,
        as: 'activityReports',
        required: false,
        where: {
          id: {
            [Op.not]: reportId,
          },
        },
      },
    ],
  });

  // see TODO above, but this can be removed when we have an "onAnyReport" flag
  const objectivesToDefinitelyDestroy = objectivesToPossiblyDestroy
    .filter((o) => !o.activityReports.length);

  if (!objectivesToDefinitelyDestroy.length) {
    return Promise.resolve();
  }

  // Delete objective.
  return Objective.destroy({
    where: {
      id: objectivesToDefinitelyDestroy.map((o) => o.id),
    },
    individualHooks: true, // We need this to ensure onAR is updated.
  });
}

export async function removeActivityReportObjectivesFromReport(reportId, objectiveIdsToRemove) {
  const activityReportObjectivesToDestroy = Array.isArray(objectiveIdsToRemove)
  && objectiveIdsToRemove.length > 0
    ? await ActivityReportObjective.findAll({
      attributes: ['id'],
      where: {
        activityReportId: reportId,
        objectiveId: objectiveIdsToRemove,
      },
    })
    : [];

  const idsToDestroy = activityReportObjectivesToDestroy.map((arObjective) => arObjective.id);

  // Delete ARO Topics, Files, etc.
  await destroyActivityReportObjectiveMetadata(idsToDestroy, objectiveIdsToRemove);

  // Delete ARO's.
  return Array.isArray(idsToDestroy) && idsToDestroy.length > 0
    ? ActivityReportObjective.destroy({
      where: {
        id: idsToDestroy,
      },
      individualHooks: true,
    })
    : Promise.resolve();
}

export async function removeUnusedGoalsObjectivesFromReport(reportId, currentObjectives) {
  const previousActivityReportObjectives = await ActivityReportObjective.findAll({
    where: {
      activityReportId: reportId,
    },
  });

  const currentObjectiveIds = currentObjectives.map((o) => o.id);

  const activityReportObjectivesToRemove = previousActivityReportObjectives.filter(
    (aro) => !currentObjectiveIds.includes(aro.objectiveId),
  );

  const objectiveIdsToRemove = activityReportObjectivesToRemove.map((aro) => aro.objectiveId);

  // Delete ARO and Topics, Resources, etc.
  await removeActivityReportObjectivesFromReport(reportId, objectiveIdsToRemove);

  // attempt to remove objectives that are no longer associated with any ARs
  // and weren't created on the RTR as a planning exercise
  await removeObjectivesFromReport(objectiveIdsToRemove, reportId);
}

/** *
 * This function will create objectives for a goal.
 * It will only create objectives that have a title or other data.
 * @param goal
 * @param objectives
 * @returns {object} Objective
 */
export async function createObjectivesForGoal(goal, objectives, reportId) {
  /*
     Note: Objective Status
     We only want to set Objective status from here on initial Objective creation.
     All subsequent Objective status updates should come from the AR Hook using end date.
  */

  if (!objectives) {
    return [];
  }

  return Promise.all(objectives.filter((o) => o.title
    || o.ttaProvided
    || o.topics?.length
    || o.resources?.length
    || o.courses?.length
    || o.files?.length).map(async (objective, index) => {
    const {
      id,
      ids,
      isNew,
      ttaProvided,
      ActivityReportObjective: aro,
      title,
      status,
      resources,
      topics,
      citations, // Not saved for objective only ARO (pass through).
      files,
      supportType,
      courses,
      closeSuspendReason,
      closeSuspendContext,
      createdHere: objectiveCreatedHere,
      ...updatedFields
    } = objective;

    // If the goal set on the objective does not match
    // the goals passed we need to save the objectives.
    const objectiveMatchesGoal = objective.goalId === goal.id;
    const updatedObjective = {
      ...updatedFields, title, goalId: goal.id,
    };
    // Check if objective exists.
    let savedObjective;
    if (!isNew && id) {
      // If the goal on this objective matches look it up by ID.
      if (objectiveMatchesGoal) {
        savedObjective = await Objective.findByPk(id);
      } else if (ids && ids.length) {
        // If the goal on this objective doesn't match, look it up by IDs and Goal ID.
        savedObjective = await Objective.findOne({
          where: {
            id: Array.isArray(ids) ? ids : [ids],
            goalId: goal.id,
          },
        });
      }
    }
    if (savedObjective) {
      // We should only allow the title to change if we are not on a approved AR.
      if (!savedObjective.onApprovedAR) {
        await savedObjective.update({
          title,
        }, { individualHooks: true });
        await savedObjective.save({ individualHooks: true });
      }
    } else {
      const objectiveTitle = updatedObjective.title ? updatedObjective.title.trim() : '';

      // Reuse an existing Objective:
      // - It is on the same goal.
      // - Has the same title.
      // Note: Values like 'Topics' will be pulled in from the existing objective.
      const existingObjective = await Objective.findOne({
        where: {
          goalId: updatedObjective.goalId,
          title: objectiveTitle,
          // We don't want to duplicate objectives if they already exist.
          // TODO: If we enable objective templates ensure the parent goal is not 'closed'.
          // status: { [Op.not]: OBJECTIVE_STATUS.COMPLETE },
        },
      });

      if (!existingObjective) {
        savedObjective = await Objective.create({
          ...updatedObjective,
          title: objectiveTitle,
          status: OBJECTIVE_STATUS.NOT_STARTED, // Only the hook should set status.
          createdVia: 'activityReport',
          createdViaActivityReportId: reportId, // AR ID if created via AR.
        });
      } else {
        savedObjective = existingObjective;
      }
    }
    return {
      ...savedObjective.toJSON(),
      status,
      topics,
      citations, // Not saved for objective only ARO (pass through).
      resources,
      files,
      courses,
      ttaProvided,
      closeSuspendReason,
      closeSuspendContext,
      index,
      supportType,
      objectiveCreatedHere,
    };
  }));
}

export async function removeActivityReportGoalsFromReport(reportId, currentGoalIds) {
  return ActivityReportGoal.destroy({
    where: {
      activityReportId: reportId,
      goalId: {
        [Op.notIn]: currentGoalIds,
      },
    },
    individualHooks: true,
  });
}

export async function removeUnusedGoalsCreatedViaAr(goalsToRemove, reportId) {
  // If we don't have goals return.
  if (!goalsToRemove.length) {
    return Promise.resolve();
  }

  // Find all goals.
  const goals = await Goal.findAll({
    where: {
      createdVia: 'activityReport',
      id: goalsToRemove,
      onApprovedAR: false,
    },
    include: [
      {
        model: ActivityReport,
        as: 'activityReports',
        required: false,
        where: {
          id: {
            [Op.not]: reportId,
          },
        },
      },
      {
        attributes: ['id', 'goalId', 'title'],
        model: Objective,
        as: 'objectives',
        required: false,
      },
    ],
  });

  // Get goals without Activity Reports.
  let unusedGoals = goals.filter((g) => !g.activityReports.length);

  // Get Goals without Objectives.
  unusedGoals = unusedGoals.filter((g) => !g.objectives.length);

  // If we have activity report goals without activity reports delete.
  if (unusedGoals.length) {
    // Delete goals.
    return Goal.destroy({
      where: {
        id: unusedGoals.map((g) => g.id),
      },
      individualHooks: true,
    });
  }

  // else do nothing.
  return Promise.resolve();
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
  let currentObjectives = [];

  // let's get all the existing goals that are not closed
  // we'll use this to determine if we need to create or update
  // we're doing it here so we don't have to query for each goal
  const existingGoals = await Goal.findAll({
    where: {
      goalTemplateId: goals.map((goal) => goal.goalTemplateId),
      grantId: goals.map((goal) => goal.grantIds).flat(),
      status: { [Op.not]: GOAL_STATUS.CLOSED },
    },
  });

  let updatedGoals = await Promise.all(goals.map(async (goal) => {
    // Loops recipients update / create goals.
    // eslint-disable-next-line implicit-arrow-linebreak
    const goalTemplate = await GoalTemplate.findByPk(goal.goalTemplateId);
    const isMonitoring = goalTemplate.standard === 'Monitoring';
    return Promise.all(goal.grantIds.map(async (grantId) => {
      let newOrUpdatedGoal = existingGoals.find((existingGoal) => (
        existingGoal.grantId === grantId && existingGoal.goalTemplateId === goal.goalTemplateId
      ));

      // If this is a monitoring goal check for existing goal.
      if (isMonitoring && !newOrUpdatedGoal) {
        // No monitoring goal for this grant skip.
        return null;
      }

      if (newOrUpdatedGoal && newOrUpdatedGoal.status === GOAL_STATUS.CLOSED) {
        // If the goal is 'Closed' create a new goal.
        newOrUpdatedGoal = null;
      }

      // If there is no existing goal, or its closed, create a new one in 'Not started'.
      // this should always be not started to capture a status change when the report is approved
      if (!newOrUpdatedGoal) {
        newOrUpdatedGoal = await Goal.create({
          goalTemplateId: goalTemplate.id,
          createdVia: 'activityReport',
          name: goalTemplate.templateName,
          grantId,
          status: GOAL_STATUS.NOT_STARTED,
        }, { individualHooks: true });
      }

      // Filter prompts for the grant associated with the goal.
      const filteredPrompts = goal.prompts?.filter((prompt) => prompt.grantId === grantId);
      // Handle goal prompts for curated goals like FEI.
      if (goalTemplate.creationMethod === CREATION_METHOD.CURATED) {
        // If there are not prompts from the report (ARG), we then save
        // them from the goal field responses in the cacheGoalMetadata() below.
        if (filteredPrompts && filteredPrompts.length) {
          await setFieldPromptsForCuratedTemplate([newOrUpdatedGoal.id], filteredPrompts);
        }
      }

      // Did the save happen in the edit mode.
      const isActivelyBeingEditing = goal.isActivelyBeingEditing
        ? goal.isActivelyBeingEditing : false;
      const reportId = report.id ? report.id : report.dataValues.id;

      // Save goal meta data.
      await cacheGoalMetadata(
        newOrUpdatedGoal,
        reportId,
        isActivelyBeingEditing, // We need to correctly populate if editing on FE.
        filteredPrompts || [],
      );

      // and pass the goal to the objective creation function
      const newGoalObjectives = await createObjectivesForGoal(
        newOrUpdatedGoal,
        goal.objectives,
        reportId,
      );
      currentObjectives = [...currentObjectives, ...newGoalObjectives];

      return newOrUpdatedGoal;
    }));
  }));

  // Filter out any null values in the updated goals array.
  updatedGoals = updatedGoals.flat().filter((goal) => goal);

  const uniqueObjectives = uniqBy(currentObjectives, 'id');
  await Promise.all(uniqueObjectives.map(async (savedObjective) => {
    const {
      status,
      index,
      topics,
      files,
      resources,
      closeSuspendContext,
      closeSuspendReason,
      ttaProvided,
      supportType,
      courses,
      objectiveCreatedHere,
      citations,
    } = savedObjective;

    // this will link our objective to the activity report through
    // activity report objective and then link all associated objective data
    // to the activity report objective to capture this moment in time
    return cacheObjectiveMetadata(
      savedObjective,
      report.id,
      {
        resources,
        topics,
        citations,
        files,
        courses,
        status,
        closeSuspendContext,
        closeSuspendReason,
        ttaProvided,
        order: index,
        supportType,
        objectiveCreatedHere,
      },
    );
  }));

  // Get all goal ids.
  const currentGoalIds = updatedGoals.map((g) => g.id);

  // Get previous DB ARG's.
  const previousActivityReportGoals = await ActivityReportGoal.findAll({
    where: {
      activityReportId: report.id,
    },
  });

  const goalsToRemove = previousActivityReportGoals.filter(
    (arg) => !currentGoalIds.includes(arg.goalId),
  ).map((r) => r.goalId);

  // Remove ARGs.
  await removeActivityReportGoalsFromReport(report.id, currentGoalIds);

  // Delete Objective ARO and associated tables.
  await removeUnusedGoalsObjectivesFromReport(
    report.id,
    currentObjectives.filter((o) => currentGoalIds.includes(o.goalId)),
  );

  // Delete Goals if not being used and created from AR.
  await removeUnusedGoalsCreatedViaAr(goalsToRemove, report.id);
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
          'createdAt',
          'updatedAt',
          'createdVia',
          'onApprovedAR',
        ],
        model: Objective,
        as: 'objectives',
        separate: true,
        where: {
          [Op.or]: [
            { createdVia: 'rtr' },
            { onApprovedAR: true },
          ],
        },
        order: [
          ['createdAt', 'ASC'],
          ['updatedAt', 'ASC'],
        ],
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
type GoalStatusType = typeof GOAL_STATUS[keyof typeof GOAL_STATUS];

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
  // default to not started
  status: GoalStatusType = GOAL_STATUS.NOT_STARTED, // default to not started
) {
  const { standard, requiresPrompts } = await getStardard(standardGoalId, grantId, rootCauses);

  if (standard.goals.length > 0) {
    throw new Error('Standard goal has already been utilized');
  }

  const newGoal = await Goal.create({
    status,
    name: standard.templateName,
    grantId,
    goalTemplateId: standard.id,
    createdVia: 'rtr',
  });

  // a new goal does not require objectives, but may include them
  if (objectives && objectives.length) {
    const objectivesToCreate = objectives.map((objective) => {
      const mappedObjective = {
        ...objective,
        createdVia: 'rtr',
        status: OBJECTIVE_STATUS.NOT_STARTED, // Using OBJECTIVE_STATUS instead of GOAL_STATUS
        goalId: newGoal.id,
      };
      return mappedObjective;
    });

    await Objective.bulkCreate(objectivesToCreate);
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
  let updatedObjectives = [];
  if (objectives.length) {
    updatedObjectives = await Promise.all(objectives.map(async (objective) => {
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

      // Lookup existing objective.
      const existingObjective = await (
        objective.id
          ? Objective.findByPk(objective.id)
          : Objective.findOne({
            where: {
              goalId: goal.id,
              title: objective.title,
            },
          }));

      if (existingObjective) {
        // Determine if we need to 'reset' the status.
        const objectiveStatus = existingObjective.status === OBJECTIVE_STATUS.COMPLETE
          || existingObjective.status === OBJECTIVE_STATUS.SUSPENDED
          ? OBJECTIVE_STATUS.IN_PROGRESS : existingObjective.status;

        // Update the existing objective.
        return existingObjective.update({
          status: objectiveStatus,
          title: objective.title,
        });
      }
      // If this is a new objective, create it.
      return Objective.create({
        title: objective.title,
        createdVia: 'rtr',
        status: GOAL_STATUS.NOT_STARTED,
        goalId: goal.id,
      });
    }));
  }

  // Delete any potentially removed objectives (regardless if we have any objectives).
  await Objective.destroy({
    where: {
      goalId: goal.id,
      id: {
        [Op.notIn]: updatedObjectives.map((o) => o.id),
      },
    },
  });

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
  onlyApprovedObjectives = false,
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
            AND (
              g2."createdVia" !='activityReport' 
              OR (g2."createdVia" = 'activityReport' AND g2."onApprovedAR" = true)
            )
            GROUP BY g2."goalTemplateId", g2."grantId", g2."prestandard"
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
      },
    ],
  });

  const ids = goals.map((g: { id: number }) => g.id);

  // If param is true only return objectives created via activityReport if the AR is approved.
  const objectiveWhere = onlyApprovedObjectives
    ? {
      [Op.or]: [
        { createdVia: 'rtr' },
        {
          createdVia: 'activityReport',
          onApprovedAR: true,
        },
      ],
    }
    : {};
  const goalRows = await Goal.findAll({
    attributes: ['id', 'name', 'status', 'createdAt', 'goalTemplateId', 'prestandard',
      // The underlying sort expect the status_sort column to be the first column _0.
      [sequelize.literal(`
        CASE
          WHEN COALESCE("Goal"."status",'')  = '' OR "Goal"."status" = 'Needs Status' THEN 1
          WHEN "Goal"."status" = 'Draft' THEN 2
          WHEN "Goal"."status" = 'Not Started' THEN 3
          WHEN "Goal"."status" = 'In Progress' THEN 4
          WHEN "Goal"."status" = 'Suspended' THEN 5
          WHEN "Goal"."status" = 'Closed' THEN 6
          ELSE 7 END`),
      'status_sort'],
      [
        sequelize.literal(`(
          SELECT COUNT(*) > 0
          FROM "Goals" g2
          WHERE g2."goalTemplateId" = "Goal"."goalTemplateId"
            AND g2."grantId" = "Goal"."grantId"
            AND g2."status" = 'Closed'
            AND g2."id" != "Goal"."id"
        )`),
        'isReopened',
      ],
      [
        sequelize.literal('"goalTemplate"."standard"'),
        'standard',
      ],
    ],
    where: {
      id: ids,
    },
    include: [
      {
        model: GoalTemplate,
        as: 'goalTemplate',
        attributes: [],
        required: true,
      },
      {
        model: GoalStatusChange,
        as: 'statusChanges',
        required: false,
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['name'],
            include: [{
              model: Role,
              as: 'roles',
              attributes: ['name'],
              through: [],
            }],
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
        where: objectiveWhere,
        order: [
          ['createdAt', 'DESC'],
        ],
        include: [
          {
            attributes: [
              'id',
              'endDate',
              'calculatedStatus',
              'regionId',
              'displayId',
            ],
            model: ActivityReport,
            as: 'activityReports',
            required: false,
            where: {
              calculatedStatus: REPORT_STATUSES.APPROVED,
            },
          },
        ],
      },
    ],
    order: [
      ...orderGoalsBy(sortBy, sortDir),
      [{ model: GoalStatusChange, as: 'statusChanges' }, 'createdAt', 'ASC'],
    ],
  });

  // Get all objective IDs from the query results
  const objectiveIds = goalRows.flatMap((goal) => {
    if (goal.objectives) {
      return goal.objectives.map((objective) => objective.id);
    }
    return [];
  });

  // Get topics and citations for objectives from approved reports
  const approvedObjectiveMetaData = await ActivityReportObjective.findAll({
    where: {
      objectiveId: objectiveIds,
    },
    attributes: ['id', 'objectiveId'],
    include: [
      {
        model: ActivityReport,
        as: 'activityReport',
        attributes: ['id', 'endDate', 'displayId'],
        required: true,
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
    order: [
      [sequelize.col('activityReport.endDate'), 'DESC'],
    ],
  });

  // Create a map of objective IDs to their metadata
  const approvedMetaDataByObjectiveId = {};
  approvedObjectiveMetaData.forEach((aro) => {
    if (!approvedMetaDataByObjectiveId[aro.objectiveId]) {
      approvedMetaDataByObjectiveId[aro.objectiveId] = [];
    }
    approvedMetaDataByObjectiveId[aro.objectiveId].push({
      id: aro.id,
      activityReport: aro.activityReport,
      topics: aro.topics.flatMap((t) => t.name),
      activityReportObjectiveCitations: aro.activityReportObjectiveCitations.map((c) => ({
        dataValues: {
          citation: c.citation,
          monitoringReferences: c.monitoringReferences,
        },
        citation: c.citation,
        monitoringReferences: c.monitoringReferences,
      })),
    });
  });

  // Populate the metadata into the corresponding goal rows
  goalRows.forEach((row) => {
    if (row.objectives) {
      // eslint-disable-next-line no-param-reassign
      row.objectives = row.objectives.map((objective) => {
        const mutableObjective = { ...objective.toJSON() };
        // eslint-disable-next-line max-len
        mutableObjective.activityReportObjectives = approvedMetaDataByObjectiveId[objective.id] || [];
        return mutableObjective;
      });
    }
  });

  // Process each goal to format objectives properly with endDate (Last TTA in the UI)
  const processedRows = goalRows.map((current) => {
    // Create a goal object similar to what getGoalsByActivityRecipient does
    const goalToAdd = {
      id: current.id,
      ids: [current.id],
      goalStatus: current.status,
      createdOn: current.createdAt,
      goalText: current.name,
      goalNumbers: [current.grant.number],
      objectiveCount: 0,
      goalTopics: [],
      reasons: [],
      grantNumbers: [current.grant.number],
    };

    // Process objectives through reduceObjectivesForRecipientRecord
    const processedObjectives = reduceObjectivesForRecipientRecord(
      current,
      goalToAdd,
      [current.grant.number],
    );

    // Create a new object with processed objectives to avoid modifying the parameter
    return {
      ...current.toJSON(),
      objectives: processedObjectives,
    };
  });

  const offsetNum = parseInt(String(offset), 10);
  const limitNum = parseInt(String(limit), 10);

  const total = goalRows.length;

  const statuses = processedRows.reduce((accumulator: {
    key: number
  }, current: { status: string }) => {
    if (current.status in accumulator) {
      accumulator[current.status] += 1;
    }

    return accumulator;
  }, {
    total,
    [GOAL_STATUS.NOT_STARTED]: 0,
    [GOAL_STATUS.IN_PROGRESS]: 0,
    [GOAL_STATUS.CLOSED]: 0,
    [GOAL_STATUS.SUSPENDED]: 0,
  });

  return {
    count: total,
    goalRows: limitNum ? processedRows.slice(offsetNum, offsetNum + limitNum) : processedRows,
    statuses: {
      total,
      Suspended: statuses[GOAL_STATUS.SUSPENDED],
      Closed: statuses[GOAL_STATUS.CLOSED],
      'Not started': statuses[GOAL_STATUS.NOT_STARTED],
      'In progress': statuses[GOAL_STATUS.IN_PROGRESS],
    },
    allGoalIds: ids,
  };
}
