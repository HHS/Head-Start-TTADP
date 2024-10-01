import { Op } from 'sequelize';
import { uniqBy, uniq } from 'lodash';
import {
  DECIMAL_BASE,
  REPORT_STATUSES,
  determineMergeGoalStatus,
} from '@ttahub/common';
import {
  Goal,
  GoalFieldResponse,
  GoalTemplate,
  GoalResource,
  GoalStatusChange,
  Grant,
  GrantReplacements,
  GrantRelationshipToActive,
  Objective,
  ActivityReportObjective,
  sequelize,
  Resource,
  ActivityReport,
  ActivityReportGoal,
  ActivityRecipient,
  Topic,
  Course,
  GoalTemplateFieldPrompt,
  ActivityReportGoalFieldResponse,
  File,
} from '../models';
import {
  OBJECTIVE_STATUS,
  GOAL_STATUS,
  SOURCE_FIELD,
  CREATION_METHOD,
} from '../constants';
import {
  cacheObjectiveMetadata,
  cacheGoalMetadata,
  destroyActivityReportObjectiveMetadata,
} from '../services/reportCache';
import { setFieldPromptsForCuratedTemplate } from '../services/goalTemplates';
import { auditLogger } from '../logger';
import {
  mergeCollaborators,
} from '../models/helpers/genericCollaborator';
import { findOrFailExistingGoal, responsesForComparison } from './helpers';
import { similarGoalsForRecipient } from '../services/similarity';
import {
  getSimilarityGroupsByRecipientId,
  createSimilarityGroup,
  setSimilarityGroupAsUserMerged,
} from '../services/goalSimilarityGroup';
import Users from '../policies/user';
import changeGoalStatus from './changeGoalStatus';
import goalsByIdAndRecipient, {
  OBJECTIVE_ATTRIBUTES_TO_QUERY_ON_RTR,
} from './goalsByIdAndRecipient';
import getGoalsForReport from './getGoalsForReport';
import { reduceGoals } from './reduceGoals';
import extractObjectiveAssociationsFromActivityReportObjectives from './extractObjectiveAssociationsFromActivityReportObjectives';
import wasGoalPreviouslyClosed from './wasGoalPreviouslyClosed';

const namespace = 'SERVICE:GOALS';
const logContext = {
  namespace,
};

/**
 *
 * @param {number} id
 * @returns {Promise{Object}}
 */
export async function goalsByIdsAndActivityReport(id, activityReportId) {
  const goals = await Goal.findAll({
    attributes: [
      'endDate',
      'status',
      ['id', 'value'],
      ['name', 'label'],
      'id',
      'name',
    ],
    where: {
      id,
    },
    include: [
      {
        model: Grant,
        as: 'grant',
      },
      {
        model: Objective,
        as: 'objectives',
        where: {
          [Op.and]: [
            {
              title: {
                [Op.ne]: '',
              },
            },
            {
              status: {
                [Op.notIn]: [OBJECTIVE_STATUS.COMPLETE, OBJECTIVE_STATUS.SUSPENDED],
              },
            },
          ],
        },
        attributes: [
          'id',
          ['title', 'label'],
          'title',
          'status',
          'goalId',
          'onApprovedAR',
          'onAR',
        ],
        required: false,
        include: [
          {
            model: ActivityReportObjective,
            as: 'activityReportObjectives',
            attributes: [
              'ttaProvided',
              'closeSuspendReason',
              'closeSuspendContext',
            ],
            required: false,
            where: {
              activityReportId,
            },
            include: [
              {
                model: Topic,
                as: 'topics',
                attributes: ['name'],
                through: {
                  attributes: [],
                },
              },
              {
                model: Resource,
                as: 'resources',
                attributes: ['url', 'title'],
                through: {
                  attributes: [],
                },
              },
              {
                model: File,
                as: 'files',
                attributes: ['originalFileName', 'key', 'url'],
                through: {
                  attributes: [],
                },
              },
              {
                model: Course,
                as: 'courses',
                attributes: ['name'],
                through: {
                  attributes: [],
                },
              },
            ],
          },
          {
            model: ActivityReport,
            as: 'activityReports',
            where: {
              calculatedStatus: {
                [Op.not]: REPORT_STATUSES.DELETED,
              },
            },
            required: false,
          },
        ],
      },
      {
        model: GoalTemplateFieldPrompt,
        as: 'prompts',
        attributes: [
          'id',
          'ordinal',
          'title',
          'prompt',
          'hint',
          'fieldType',
          'options',
          'validations',
        ],
        required: false,
        include: [
          {
            model: GoalFieldResponse,
            as: 'responses',
            attributes: [
              'response',
            ],
            required: false,
            where: { goalId: id },
          },
          {
            model: ActivityReportGoalFieldResponse,
            as: 'reportResponses',
            attributes: ['response'],
            required: false,
            include: [{
              model: ActivityReportGoal,
              as: 'activityReportGoal',
              attributes: ['activityReportId', ['id', 'activityReportGoalId']],
              required: true,
              where: { goalId: id, activityReportId },
            }],
          },
        ],
      },
    ],
  });

  const reformattedGoals = goals.map((goal) => ({
    ...goal,
    isReopenedGoal: wasGoalPreviouslyClosed(goal),
    objectives: goal.objectives
      .map((objective) => ({
        ...objective.toJSON(),
        topics: extractObjectiveAssociationsFromActivityReportObjectives(
          objective.activityReportObjectives,
          'topics',
        ),
        courses: extractObjectiveAssociationsFromActivityReportObjectives(
          objective.activityReportObjectives,
          'courses',
        ),
        resources: extractObjectiveAssociationsFromActivityReportObjectives(
          objective.activityReportObjectives,
          'resources',
        ),
        files: extractObjectiveAssociationsFromActivityReportObjectives(
          objective.activityReportObjectives,
          'files',
        ),
      })),
  }));

  const reducedGoals = reduceGoals(reformattedGoals);

  // sort reduced goals by rtr order
  reducedGoals.sort((a, b) => {
    if (a.rtrOrder < b.rtrOrder) {
      return -1;
    }
    return 1;
  });

  return reducedGoals;
}

/**
 *
 * @param {*} goalId
 * @param {*} activityReportId
 * @returns {Promise<Object>}
 */
export function goalByIdAndActivityReport(goalId, activityReportId) {
  return Goal.findOne({
    attributes: [
      'endDate',
      'status',
      ['id', 'value'],
      ['name', 'label'],
      'id',
      'name',
    ],
    where: {
      id: goalId,
    },
    include: [
      {
        where: {
          [Op.and]: [
            {
              title: {
                [Op.ne]: '',
              },
            },
            {
              status: {
                [Op.notIn]: ['Complete'],
              },
            },
          ],
        },
        attributes: [
          'id',
          'title',
          'title',
          'status',
        ],
        model: Objective,
        as: 'objectives',
        required: false,
        include: [
          {
            model: Resource,
            as: 'resources',
            attributes: [
              ['url', 'value'],
              ['id', 'key'],
            ],
            required: false,
            through: {
              attributes: [],
              where: { sourceFields: { [Op.contains]: [SOURCE_FIELD.OBJECTIVE.RESOURCE] } },
              required: false,
            },
          },
          {
            model: ActivityReportObjective,
            as: 'activityReportObjectives',
            attributes: [
              'ttaProvided',
            ],
            required: true,
            where: {
              activityReportId,
            },
          },
          {
            model: Topic,
            as: 'topics',
            attributes: [
              ['id', 'value'],
              ['name', 'label'],
            ],
            required: false,
          },
          {
            model: File,
            as: 'files',
            required: false,
          },
        ],
      },
    ],
  });
}

export async function goalByIdWithActivityReportsAndRegions(goalId) {
  const goal = Goal.findOne({
    attributes: [
      'name',
      'id',
      'status',
      'createdVia',
    ],
    where: {
      id: goalId,
    },
    include: [
      {
        model: GoalStatusChange,
        as: 'statusChanges',
        attributes: ['oldStatus'],
        required: false,
      },
      {
        model: Grant,
        as: 'grant',
        attributes: ['regionId'],
      },
      {
        attributes: ['id'],
        model: Objective,
        as: 'objectives',
        required: false,
        include: [{
          attributes: ['id'],
          model: ActivityReport,
          as: 'activityReports',
          required: false,
        }],
      },
    ],
  });

  if (goal.statusChanges && goal.statusChanges.length > 0) {
    goal.previousStatus = goal.statusChanges[goal.statusChanges.length - 1].oldStatus;
  }

  return goal;
}

async function cleanupObjectivesForGoal(goalId, currentObjectives) {
  // get all objectives not currently on a goal
  const orphanedObjectives = await Objective.findAll({
    attributes: ['id'],
    where: {
      goalId,
      id: {
        [Op.notIn]: currentObjectives.map((objective) => objective.id),
      },
    },
    include: [
      {
        model: ActivityReport,
        as: 'activityReports',
        required: false,
      },
    ],
  });

  const orphanedObjectiveIds = orphanedObjectives
    .filter((objective) => !objective.activityReports || !objective.activityReports.length)
    .map((objective) => objective.id);

  return (Array.isArray(orphanedObjectiveIds) && orphanedObjectiveIds.length > 0)
    ? Objective.destroy({
      where: {
        id: orphanedObjectiveIds,
      },
      individualHooks: true,
    })
    : Promise.resolve();
}

/**
 * Goals is an array of an object with the following keys
    id,
    grants,
    name,
    status,
    endDate,
    regionId,
    recipientId,

  The goal model has the following columns
    id,
    name,
    status,
    timeframe,
    isFromSmartsheetTtaPlan
    endDate,

 * @param {Object} goals
 * @returns created or updated goal with grant goals
 */
export async function createOrUpdateGoals(goals) {
  // there can only be one on the goal form (multiple grants maybe, but one recipient)
  let recipient;
  // eslint-disable-next-line max-len
  const goalIds = await Promise.all(goals.map(async (goalData, rtrOrder) => {
    const {
      ids,
      grantId,
      recipientId,
      regionId,
      objectives,
      createdVia,
      endDate,
      status,
      prompts,
      isCurated,
      source,
      goalTemplateId,
      ...options
    } = goalData;

    // there can only be one on the goal form (multiple grants maybe, but one recipient)
    recipient = recipientId;
    let newGoal;
    // we first need to see if the goal exists given what ids we have
    if (ids && ids.length) {
      newGoal = await Goal.findOne({
        where: {
          grantId,
          status: { [Op.not]: 'Closed' },
          id: ids,
        },
      });
    }

    if (!newGoal) {
      newGoal = await Goal.create({
        grantId,
        name: options.name.trim(),
        status: 'Draft', // if we are creating a goal for the first time, it should be set to 'Draft'
        isFromSmartsheetTtaPlan: false,
        rtrOrder: rtrOrder + 1,
        createdVia: 'rtr',
      });
    }

    if (isCurated && prompts) {
      await setFieldPromptsForCuratedTemplate([newGoal.id], prompts);
    }

    if (isCurated && !newGoal.goalTemplateId && goalTemplateId) {
      newGoal.set({ goalTemplateId });
    }

    // we can't update this stuff if the goal is on an approved AR
    if (newGoal && !newGoal.onApprovedAR) {
      newGoal.set({
        ...(options && options.name && { name: options.name.trim() }),
      });

      if (newGoal.status !== status) {
        newGoal.set({ status });
      }
    }

    // end date and source can be updated if the goal is not closed
    // which it won't be at this point (refer to above where we check for closed goals)
    if (endDate && newGoal.endDate !== endDate) {
      newGoal.set({ endDate });
    }

    if (source && newGoal.source !== source) {
      newGoal.set({ source });
    }

    await newGoal.save({ individualHooks: true });

    const newObjectives = await Promise.all(
      objectives.map(async (o, index) => {
        const {
          title,
          status: objectiveStatus,
          id: objectiveIdsMayContainStrings,
        } = o;

        const objectiveIds = [objectiveIdsMayContainStrings]
          .flat()
          .filter((id) => parseInt(id, DECIMAL_BASE));

        let objective;

        // if the objective is complete on both the front and back end
        // we need to handle things a little differently
        if (objectiveStatus === OBJECTIVE_STATUS.COMPLETE && objectiveIds && objectiveIds.length) {
          objective = await Objective.findOne({
            attributes: OBJECTIVE_ATTRIBUTES_TO_QUERY_ON_RTR,
            where: {
              id: objectiveIds,
              status: OBJECTIVE_STATUS.COMPLETE,
              goalId: newGoal.id,
            },
          });

          if (objective) {
            return objective.toJSON();
          }
        }

        if (objectiveIds && objectiveIds.length) {
          // this needs to find "complete" objectives as well
          // since we could be moving the status back from the RTR
          objective = await Objective.findOne({
            attributes: OBJECTIVE_ATTRIBUTES_TO_QUERY_ON_RTR,
            where: {
              id: objectiveIds,
              goalId: newGoal.id,
            },
          });
        }

        // if there isn't an objective for that goal/objective id
        if (!objective) {
          // first we check to see if there is an objective with the same title
          // so we can reuse it (given it is not complete)
          objective = await Objective.findOne({
            attributes: OBJECTIVE_ATTRIBUTES_TO_QUERY_ON_RTR,
            where: {
              status: { [Op.not]: OBJECTIVE_STATUS.COMPLETE },
              title,
              goalId: newGoal.id,
            },
          });
          // and if there isn't, we create a new one
          if (!objective) {
            objective = await Objective.create({
              status: objectiveStatus,
              title,
              goalId: newGoal.id,
              createdVia: 'rtr',
            });
          }
        }

        // if the objective is not on an approved report
        // and the title is different, update title
        objective.set({
          ...(!objective.onApprovedAR
            && title.trim() !== objective.dataValues.title.trim()
            && { title }),
          rtrOrder: index + 1,
        });

        // save the objective to the database
        await objective.save({ individualHooks: true });

        return objective.toJSON();
      }),
    );

    // this function deletes unused objectives
    await cleanupObjectivesForGoal(newGoal.id, newObjectives);
    return newGoal.id;
  }));

  // we have to do this outside of the transaction otherwise
  // we get the old values
  return goalsByIdAndRecipient(goalIds, recipient);
}

export async function goalsForGrants(grantIds) {
  /**
   * get all the matching grants
   */
  const grants = await Grant.findAll({
    attributes: ['id', ['grantRelationships.grantId']],
    where: {
      id: grantIds,
    },
    include: [{
      model: GrantRelationshipToActive,
      as: 'grantRelationships',
      attributes: [],
    }],
  });

  /**
   * we need one big array that includes the old recipient id as well,
   * removing all the nulls along the way
   */
  const ids = Array.from(new Set(grants
    .reduce((previous, current) => [...previous, current.id, current.oldGrantId], [])
    .filter((g) => g)));

  /*
  * finally, return all matching goals
  */

  return Goal.findAll({
    attributes: [
      [sequelize.fn(
        'ARRAY_AGG',
        sequelize.fn(
          'DISTINCT',
          sequelize.col('grant.id'),
        ),
      ), 'grantIds'],
      [sequelize.fn(
        'ARRAY_AGG',
        sequelize.fn(
          'DISTINCT',
          sequelize.col('"Goal"."id"'),
        ),
      ), 'goalIds'],
      [sequelize.fn(
        'ARRAY_AGG',
        sequelize.fn(
          'DISTINCT',
          sequelize.col('grantRelationships.grantId'),
        ),
      ), 'oldGrantIds'],
      [sequelize.fn(
        'MAX',
        sequelize.fn(
          'DISTINCT',
          sequelize.col('"Goal"."createdAt"'),
        ),
      ), 'created'],
      [sequelize.fn(
        'MAX',
        sequelize.fn(
          'DISTINCT',
          sequelize.col('"Goal"."goalTemplateId"'),
        ),
      ), 'goalTemplateId'],
      'name',
      'status',
      'onApprovedAR',
      'endDate',
      'source',
      'createdVia',
      [sequelize.fn('BOOL_OR', sequelize.literal(`"goalTemplate"."creationMethod" = '${CREATION_METHOD.CURATED}'`)), 'isCurated'],
    ],
    group: ['"Goal"."name"', '"Goal"."status"', '"Goal"."endDate"', '"Goal"."onApprovedAR"', '"Goal"."source"', '"Goal"."createdVia"'],
    where: {
      name: {
        [Op.ne]: '', // exclude "blank" goals
      },
      '$grant.id$': ids,
      status: {
        [Op.notIn]: ['Closed', 'Suspended'],
      },
    },
    include: [
      {
        model: Grant.unscoped(),
        as: 'grant',
        attributes: [],
        include: [{
          model: GrantRelationshipToActive,
          as: 'grantRelationships',
          attributes: [],
        }],
      },
      {
        model: GoalTemplate,
        as: 'goalTemplate',
        attributes: [],
        required: false,
      },
    ],
    order: [[sequelize.fn(
      'MAX',
      sequelize.fn(
        'DISTINCT',
        sequelize.col('"Goal"."createdAt"'),
      ),
    ), 'desc']],
  });
}

async function removeActivityReportObjectivesFromReport(reportId, objectiveIdsToRemove) {
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

async function removeActivityReportGoalsFromReport(reportId, currentGoalIds) {
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

export async function setActivityReportGoalAsActivelyEdited(goalIdsAsString, reportId, pageState) {
  const GOALS_AND_OBJECTIVES_PAGE = '2';
  const IN_PROGRESS = 'In progress';

  try {
    // because of the way express works, goalIdsAsString is a string or an array of strings
    // so we flatmap it here to handle both cases
    const goalIds = [goalIdsAsString].flatMap((id) => parseInt(id, DECIMAL_BASE));

    // set all other goals back to actively edited: false
    await ActivityReportGoal.update({
      isActivelyEdited: false,
    }, {
      where: {
        activityReportId: reportId,
        goalId: {
          [Op.notIn]: goalIds,
        },
      },
    });

    // we also need to update the activity report page state
    await ActivityReport.update({
      pageState: {
        ...pageState,
        [GOALS_AND_OBJECTIVES_PAGE]: IN_PROGRESS,
      },
    }, {
      where: {
        id: reportId,
      },
    });

    // finally, set the goals that are actively edited to true
    return ActivityReportGoal.update({
      isActivelyEdited: true,
    }, {
      where: {
        activityReportId: reportId,
        goalId: goalIds,
      },
      returning: true,
    });
  } catch (error) {
    auditLogger.error(
      ` SERVICE:GOALS:setActivityReportGoalsAsActivelyEdited\nunable to update ActivityReportGoals table \n${error}`,
    );

    return [];
  }
}

async function removeUnusedGoalsCreatedViaAr(goalsToRemove, reportId) {
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
    });
  }

  // else do nothing.
  return Promise.resolve();
}

async function removeObjectives(objectivesToRemove, reportId) {
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

  // Objectives to destroy.
  const objectivesIdsToDestroy = objectivesToDefinitelyDestroy.map((o) => o.id);

  // Delete objective.
  return Objective.destroy({
    where: {
      id: objectivesToDefinitelyDestroy.map((o) => o.id),
    },
  });
}

export async function removeRemovedRecipientsGoals(removedRecipientIds, report) {
  if (!removedRecipientIds
    || !(Array.isArray(removedRecipientIds) && removedRecipientIds.length > 0)) {
    return null;
  }

  const reportId = parseInt(sequelize.escape(report.id), DECIMAL_BASE);

  const goals = await Goal.findAll({
    attributes: [
      'id',
      [
        sequelize.literal(`
        ((select count(*)
        from "ActivityReportGoals"
        where "ActivityReportGoals"."goalId" = "Goal"."id"
        and "ActivityReportGoals"."activityReportId" not in (${reportId}))::int > 0)`),
        'onOtherAr',
      ],
    ],
    where: {
      grantId: removedRecipientIds,
    },
    include: [
      {
        model: ActivityReport,
        as: 'activityReports',
        required: true,
        where: {
          id: reportId,
        },
      },
    ],
  });

  const goalIds = goals.map((goal) => goal.id);
  const goalsToDelete = goals.filter((goal) => !goal.get('onOtherAr')).map((goal) => goal.id);

  if (Array.isArray(goalIds) && goalIds.length > 0) {
    await ActivityReportGoal.destroy({
      where: {
        goalId: goalIds,
        activityReportId: reportId,
      },
      individualHooks: true,
    });
  }

  const objectives = await Objective.findAll({
    attributes: [
      'id',
      [
        sequelize.literal(`
        ((select count(*)
        from "ActivityReportObjectives"
        where "ActivityReportObjectives"."objectiveId" = "Objective"."id"
        and "ActivityReportObjectives"."activityReportId" not in (${reportId}))::int > 0)`),
        'onOtherAr',
      ],
    ],
    where: {
      goalId: goalIds,
    },
    include: [
      {
        model: ActivityReport,
        as: 'activityReports',
        required: true,
        where: {
          id: reportId,
        },
      },
    ],
  });

  const objectiveIds = objectives.map((objective) => objective.id);
  const objectivesToDelete = objectives.filter(
    (objective) => !objective.get('onOtherAr'),
  ).map((objective) => objective.id);

  if (Array.isArray(objectiveIds) && objectiveIds.length > 0) {
    await ActivityReportObjective.destroy({
      where: {
        objectiveId: objectiveIds,
        activityReportId: reportId,
      },
      individualHooks: true,
    });
  }

  if (Array.isArray(objectivesToDelete) && objectivesToDelete.length > 0) {
    const objectivesToDefinitelyDestroy = await Objective.findAll({
      attributes: [
        'id',
        'onApprovedAR',
      ],
      where: {
        id: objectivesToDelete,
        onApprovedAR: false,
      },
    });

    if (Array.isArray(objectivesToDefinitelyDestroy) && objectivesToDefinitelyDestroy.length > 0) {
      const objectiveIdsToDestroy = objectivesToDefinitelyDestroy.map((o) => o.id);

      await Objective.destroy({
        where: {
          id: objectiveIdsToDestroy,
          onApprovedAR: false,
        },
        individualHooks: true,
      });
    }
  }

  return Goal.destroy({
    where: {
      id: goalsToDelete,
      onApprovedAR: false,
      createdVia: 'activityReport',
    },
    individualHooks: true,
  });
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
  await removeObjectives(objectiveIdsToRemove, reportId);
}

async function createObjectivesForGoal(goal, objectives) {
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
    || o.topics.length
    || o.resources.length
    || o.courses.length
    || o.files.length).map(async (objective, index) => {
    const {
      id,
      isNew,
      ttaProvided,
      ActivityReportObjective: aro,
      title,
      status,
      resources,
      topics,
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
    const createNewObjectives = objective.goalId !== goal.id;
    const updatedObjective = {
      ...updatedFields, title, goalId: goal.id,
    };

    // Check if objective exists.
    let savedObjective;
    if (!isNew && id && !createNewObjectives) {
      savedObjective = await Objective.findByPk(id);
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
      // - And status is not completed.
      // Note: Values like 'Topics' will be pulled in from the existing objective.
      const existingObjective = await Objective.findOne({
        where: {
          goalId: updatedObjective.goalId,
          title: objectiveTitle,
          status: { [Op.not]: OBJECTIVE_STATUS.COMPLETE },
        },
      });
      if (!existingObjective) {
        savedObjective = await Objective.create({
          ...updatedObjective,
          title: objectiveTitle,
          status: OBJECTIVE_STATUS.NOT_STARTED, // Only the hook should set status.
          createdVia: 'activityReport',
        });
      } else {
        savedObjective = existingObjective;
      }
    }
    return {
      ...savedObjective.toJSON(),
      status,
      topics,
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

export async function saveGoalsForReport(goals, report) {
  // this will be all the currently used objectives
  // so we can remove any objectives that are no longer being used
  let currentObjectives = [];

  // let's get all the existing goals that are not closed
  // we'll use this to determine if we need to create or update
  // we're doing it here so we don't have to query for each goal
  const existingGoals = await Goal.findAll({
    where: {
      id: goals.map((goal) => goal.goalIds).flat(),
      grantId: goals.map((goal) => goal.grantIds).flat(),
      status: { [Op.not]: GOAL_STATUS.CLOSED },
    },
  });

  const currentGoals = await Promise.all(goals.map(async (goal) => {
    const status = goal.status ? goal.status : GOAL_STATUS.DRAFT;
    const endDate = goal.endDate && goal.endDate.toLowerCase() !== 'invalid date' ? goal.endDate : null;
    const isActivelyBeingEditing = goal.isActivelyBeingEditing
      ? goal.isActivelyBeingEditing : false;

    const isMultiRecipientReport = (goal.grantIds.length > 1);

    return Promise.all(goal.grantIds.map(async (grantId) => {
      let newOrUpdatedGoal;

      // first pull out all the crufty fields
      const {
        isNew: isGoalNew,
        goalIds,
        objectives,
        grantIds,
        status: discardedStatus,
        onApprovedAR,
        createdVia,
        prompts,
        source,
        grant,
        grantId: discardedGrantId,
        id, // we can't be trying to set this
        endDate: discardedEndDate, // get this outta here
        ...fields
      } = goal;

      // does a goal exist for this ID & grantId combination?
      newOrUpdatedGoal = existingGoals.find((extantGoal) => (
        (goalIds || []).includes(extantGoal.id) && extantGoal.grantId === grantId
      ));

      // if not, does it exist for this name and grantId combination
      if (!newOrUpdatedGoal) {
        newOrUpdatedGoal = await Goal.findOne({
          where: {
            name: goal.name ? goal.name.trim() : '',
            grantId,
            status: { [Op.not]: GOAL_STATUS.CLOSED },
          },
        });
      }

      // if not, we create it
      if (!newOrUpdatedGoal) {
        newOrUpdatedGoal = await Goal.create({
          createdVia: 'activityReport',
          name: goal.name ? goal.name.trim() : '',
          grantId,
          status,
        }, { individualHooks: true });
      }

      if (source && newOrUpdatedGoal.source !== source) {
        newOrUpdatedGoal.set({ source });
      }

      if (!newOrUpdatedGoal.onApprovedAR) {
        if (fields.name !== newOrUpdatedGoal.name && fields.name) {
          newOrUpdatedGoal.set({ name: fields.name.trim() });
        }
      }

      if (endDate && endDate !== 'Invalid date' && endDate !== newOrUpdatedGoal.endDate) {
        newOrUpdatedGoal.set({ endDate });
      }

      if (prompts && !isMultiRecipientReport) {
        await setFieldPromptsForCuratedTemplate([newOrUpdatedGoal.id], prompts);
      }

      // here we save the goal where the status (and collorary fields) have been set
      // as well as possibly the name and end date
      await newOrUpdatedGoal.save({ individualHooks: true });

      // then we save the goal metadata (to the activity report goal table)
      await cacheGoalMetadata(
        newOrUpdatedGoal,
        report.id,
        isActivelyBeingEditing,
        prompts || null,
        isMultiRecipientReport,
      );

      // and pass the goal to the objective creation function
      const newGoalObjectives = await createObjectivesForGoal(newOrUpdatedGoal, objectives, report);
      currentObjectives = [...currentObjectives, ...newGoalObjectives];

      return newOrUpdatedGoal;
    }));
  }));

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

  const currentGoalIds = currentGoals.flat().map((g) => g.id);

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
 * Verifies if the goal status transition is allowed
 * @param {string} oldStatus
 * @param {string} newStatus
 * @param {number[]} goalIds
 * @param {string[]} previousStatus
 * @returns {boolean} whether or not the transition is allowed
 */
export function verifyAllowedGoalStatusTransition(oldStatus, newStatus, previousStatus) {
  // here is a little matrix of all the allowed status transitions
  // you can see most are disallowed, but there are a few allowed
  const ALLOWED_TRANSITIONS = {
    [GOAL_STATUS.DRAFT]: [GOAL_STATUS.CLOSED],
    [GOAL_STATUS.NOT_STARTED]: [GOAL_STATUS.CLOSED, GOAL_STATUS.SUSPENDED],
    [GOAL_STATUS.IN_PROGRESS]: [GOAL_STATUS.CLOSED, GOAL_STATUS.SUSPENDED],
    [GOAL_STATUS.SUSPENDED]: [GOAL_STATUS.IN_PROGRESS, GOAL_STATUS.CLOSED],
    [GOAL_STATUS.CLOSED]: [],
  };

  // here we handle a weird status and create the array of allowed statuses
  let allowed = ALLOWED_TRANSITIONS[oldStatus] ? [...ALLOWED_TRANSITIONS[oldStatus]] : [];
  // if the goal is suspended, we allow both closing it and transitioning to the previous status
  if (oldStatus === GOAL_STATUS.SUSPENDED) {
    allowed = [...allowed, ...previousStatus];
  }

  return allowed.includes(newStatus);
}

/**
 * Updates a goal status by id
 * @param {number[]} goalIds
 * @param {number} userId
 * @param {string} oldStatus
 * @param {string} newStatus
 * @param {string} closeSuspendReason
 * @param {string} closeSuspendContext
 * @param {string[]} previousStatus
 * @returns {Promise<Model|boolean>} updated goal
 */
export async function updateGoalStatusById(
  goalIds,
  userId,
  oldStatus,
  newStatus,
  closeSuspendReason,
  closeSuspendContext,
  previousStatus,
) {
  // Since reason cannot be null, but sometimes we just can't know the reason (or we don't ask),
  // a default value of "Unknown" is used.
  const reason = closeSuspendReason?.trim() || 'Unknown';

  // first, we verify that the transition is allowed
  const allowed = verifyAllowedGoalStatusTransition(
    oldStatus,
    newStatus,
    previousStatus,
  );

  if (!allowed) {
    auditLogger.error(`UPDATEGOALSTATUSBYID: Goal status transition from ${oldStatus} to ${newStatus} not allowed for goal ${goalIds}`);
    return false;
  }

  return Promise.all(goalIds.map((goalId) => changeGoalStatus({
    goalId,
    userId,
    newStatus,
    reason,
    context: closeSuspendContext,
  })));
}
export async function createOrUpdateGoalsForActivityReport(goals, reportId) {
  const activityReportId = parseInt(reportId, DECIMAL_BASE);
  const report = await ActivityReport.findByPk(activityReportId);
  await saveGoalsForReport(goals, report);
  // updating the goals is updating the report, sorry everyone
  await sequelize.query(`UPDATE "ActivityReports" SET "updatedAt" = '${new Date().toISOString()}' WHERE id = ${activityReportId}`);
  // note that for some reason (probably sequelize automagic)
  // both model.update() and model.set() + model.save() do NOT update the updatedAt field
  // even if you explicitly set it in the update or save to the current new Date()
  // hence the raw query above
  //
  // note also that if we are able to spend some time refactoring
  // the usage of react-hook-form on the frontend AR report, we'd likely
  // not have to worry about this, it's just a little bit disjointed right now
  return getGoalsForReport(activityReportId);
}

export async function destroyGoal(goalIds) {
  try {
    if (typeof goalIds === 'number') {
      goalIds = [goalIds]; // eslint-disable-line no-param-reassign
    } else if (!(Array.isArray(goalIds) && goalIds.map((i) => typeof i).every((i) => i === 'number'))) {
      throw new Error('goalIds is not a number or and array of numbers');
    }
    const reportsWithGoal = (Array.isArray(goalIds) && goalIds.length)
      ? await ActivityReport.findAll({
        attributes: ['id'],
        include: [
          {
            attributes: ['id'],
            model: Goal,
            required: true,
            where: {
              id: goalIds,
            },
            as: 'goals',
          },
        ],
      })
      : [];

    const isOnReport = reportsWithGoal.length;
    if (isOnReport) {
      throw new Error('Goal is on an activity report and can\'t be deleted');
    }

    const objectives = (Array.isArray(goalIds) && goalIds.length)
      ? await Objective.findAll({
        attributes: ['id'],
        where: {
          goalId: { [Op.in]: goalIds },
        },
      })
      : [];

    const objectiveIds = objectives.map((o) => o.id);

    const objectivesDestroyed = (Array.isArray(objectiveIds) && objectiveIds.length)
      ? await Objective.destroy({
        where: {
          id: { [Op.in]: objectiveIds },
        },
        individualHooks: true,
      })
      : await Promise.resolve();

    const goalsDestroyed = (Array.isArray(goalIds) && goalIds.length)
      ? await Goal.destroy({
        where: {
          id: { [Op.in]: goalIds },
        },
        individualHooks: true,
      })
      : await Promise.resolve();

    return {
      goalsDestroyed,
      objectivesDestroyed,
    };
  } catch (error) {
    auditLogger.error(
      `${logContext.namespace} - Sequelize error - unable to delete from db - ${error}`,
    );
    return 0;
  }
}

/**
 * @param {goals[]} include .activityReportGoals
 * @returns {
*  reportId: { grantId: countOfGoalsOnReport },
* }
*/
export const getReportCountForGoals = (goals) => goals.reduce((acc, goal) => {
  (goal.activityReportGoals || []).forEach((arg) => {
    if (!acc[arg.activityReportId]) {
      acc[arg.activityReportId] = {};
    }
    if (!acc[arg.activityReportId][goal.grantId]) {
      acc[arg.activityReportId][goal.grantId] = 0;
    }
    acc[arg.activityReportId][goal.grantId] += 1;
  });

  return acc;
}, {});

const fieldMappingForDeduplication = {
  name: 'name',
  source: 'source',
  status: 'status',
  responsesForComparison: 'responsesForComparison',
};

/**
*
* key is activityReportid, value is count of goals on that report
* @param {{ number: { number: number } }} countObject
*/
// eslint-disable-next-line max-len
export const hasMultipleGoalsOnSameActivityReport = (countObject) => Object.values(countObject)
  .some((grants) => Object.values(grants).some((c) => c > 1));

/**
* @param {Number} recipientId
* @returns {
*  goals: [{
*    name: string,
*    source: string,
*    status: string,
*    responsesForComparison: string,
*    ids: number[],
*  }],
*  ids: number[]
* }[]
*/
export async function getGoalIdsBySimilarity(recipientId, regionId, user = null) {
  /**
   * if a user has the ability to merged closed curated goals, we will show them in the UI
   */
  const hasClosedMergeGoalOverride = !!(user && new Users(user).canSeeBehindFeatureFlag('closed_goal_merge_override'));

  const similiarityWhere = {
    userHasInvalidated: false,
    finalGoalId: null,
  };

  // then, we check for goal similarity groups that have already been created
  const existingRecipientGroups = await getSimilarityGroupsByRecipientId(
    recipientId,
    similiarityWhere,
    hasClosedMergeGoalOverride,
    regionId,
  );

  if (existingRecipientGroups.length) {
    return existingRecipientGroups;
  }

  // otherwise, we'll create the groups
  // with a little if just in case the similarity API craps out on us (technical term)
  const similarity = await similarGoalsForRecipient(recipientId, true);
  let result = [];
  if (similarity) {
    result = similarity.result;
  }

  // convert the response to a group of IDs
  const goalIdGroups = (result || []).map((matchedGoals) => {
    const { id, matches } = matchedGoals;
    return uniq([id, ...matches.map((match) => match.id)]);
  });

  const invalidStatusesForReportGoals = [
    REPORT_STATUSES.SUBMITTED,
    REPORT_STATUSES.DRAFT,
    REPORT_STATUSES.NEEDS_ACTION,
  ];

  // convert the ids to a big old database query
  const goalGroups = await Promise.all(goalIdGroups.map((group) => Goal.findAll({
    attributes: ['id', 'status', 'name', 'source', 'goalTemplateId', 'grantId'],
    where: {
      id: group,
    },
    include: [
      {
        model: GoalStatusChange,
        as: 'statusChanges',
        attributes: ['oldStatus', 'newStatus'],
        required: false,
      },
      {
        model: ActivityReportGoal,
        as: 'activityReportGoals',
        attributes: ['goalId', 'activityReportId'],
        required: false,
        include: [{
          model: ActivityReport,
          as: 'activityReport',
          required: false,
          attributes: ['id', 'calculatedStatus'],
          where: {
            calculatedStatus: invalidStatusesForReportGoals,
          },
        }],
      },
      {
        model: Grant,
        as: 'grant',
        required: true,
        attributes: ['id', 'status'],
      },
      {
        model: GoalFieldResponse,
        as: 'responses',
        required: false,
        attributes: ['response', 'goalId'],
      },
      {
        model: GoalTemplate,
        as: 'goalTemplate',
        required: false,
        attributes: ['id', 'creationMethod'],
      },
    ],
  })));

  const uniqueGrantIds = uniq(goalGroups.map((group) => group.map((goal) => goal.grantId)).flat());

  const grants = await Grant.findAll({
    attributes: ['id', 'status'],
    where: {
      [Op.or]: [
        { id: uniqueGrantIds },
        { '$grantRelationships.grantId$': uniqueGrantIds },
      ],
    },
    include: [
      {
        model: GrantRelationshipToActive,
        as: 'grantRelationships',
        attributes: ['activeGrantId', 'grantId'],
        required: false,
        include: [
          {
            model: Grant,
            as: 'activeGrant',
            attributes: ['id', 'status'],
          },
        ],
      },
    ],
  });

  const grantLookup = {};
  grants.forEach((grant) => {
    if (grant.status === 'Active') {
      grantLookup[grant.id] = grant.id;
    } else {
      grant.grantRelationships.forEach((relationship) => {
        if (relationship.activeGrant && relationship.activeGrant.status === 'Active') {
          grantLookup[grant.id] = relationship.activeGrantId;
        }
      });
    }
  });

  const filteredGoalGroups = goalGroups
    .filter((group) => {
    // filter out goals with weird FEI responses
    // eslint-disable-next-line max-len
      const uniqueFieldResponses = uniq(group.map((goal) => goal.responses.map((response) => response.response)).flat(2));

      if (uniqueFieldResponses.length > 2) {
        return false;
      }

      // filter out goal groups that include multiple goals on the same report
      const reportCount = getReportCountForGoals(group);
      const goalsNotOnTheSameReport = !hasMultipleGoalsOnSameActivityReport(reportCount);

      return goalsNotOnTheSameReport;
    });

  const goalGroupsDeduplicated = filteredGoalGroups.map((group) => group
    .reduce((previous, current) => {
      if (!grantLookup[current.grantId]) {
        return previous;
      }

      let closedCurated = false;
      if (current.goalTemplate && current.goalTemplate.creationMethod === CREATION_METHOD.CURATED) {
        closedCurated = current.status === GOAL_STATUS.CLOSED;
      }

      // goal on an active report
      let isOnActiveReport = false;
      if (current.activityReportGoals.length) {
        isOnActiveReport = current.activityReportGoals
          .some((arg) => arg.activityReport);
      }

      const excludedIfNotAdmin = isOnActiveReport || closedCurated;

      // see if we can find an existing goal
      const existingGoal = findOrFailExistingGoal(current, previous, fieldMappingForDeduplication);
      // if we found an existing goal,
      // we'll add the current goal's ID to the existing goal's ID array

      if (existingGoal && existingGoal.excludedIfNotAdmin === excludedIfNotAdmin) {
        existingGoal.ids.push(current.id);
        return previous;
      }

      return [
        ...previous,
        {
          name: current.name,
          source: current.source,
          status: current.status,
          responsesForComparison: responsesForComparison(current),
          ids: [current.id],
          excludedIfNotAdmin,
          grantId: grantLookup[current.grantId],
        },
      ];
    }, []));

  const groupsWithMoreThanOneGoalAndMoreGoalsThanGrants = goalGroupsDeduplicated
    .filter((group) => {
      const grantIds = uniq(group.map((goal) => goal.grantId));
      return group.length > 1 && group.length !== grantIds.length;
    });

  // save the groups to the database
  // there should also always be an empty group
  // to signify that there are no similar goals
  // and that we've run these computations

  await Promise.all(
    [...groupsWithMoreThanOneGoalAndMoreGoalsThanGrants, []]
      .map((gg) => (
        createSimilarityGroup(
          recipientId,
          gg,
        ))),
  );

  return getSimilarityGroupsByRecipientId(
    recipientId,
    similiarityWhere,
    hasClosedMergeGoalOverride,
    regionId,
  );
}

/**
 *
 * @param {*} objective
 * @param {*} parentGoalId
 */
export async function mergeObjectiveFromGoal(objective, parentGoalId) {
  const { dataValues } = objective;
  const { id, goalId, ...data } = dataValues;

  const newObjective = await Objective.create({
    ...data,
    goalId: parentGoalId,
  }, {
    ignoreHooks: { name: 'autoPopulateCreator' },
    individualHooks: true,
  });

  const updatesToRelatedModels = [];

  updatesToRelatedModels.push(mergeCollaborators(
    'objective',
    sequelize,
    null,
    newObjective.id,
    [id],
    id,
  ));

  updatesToRelatedModels.push(Objective.update({
    mapsToParentObjectiveId: newObjective.id,
  }, {
    where: {
      id,
    },
    individualHooks: true,
  }));

  // for activity report objectives, simply update
  // existing objectives to point to the new objective
  objective.activityReportObjectives.forEach((aro) => {
    updatesToRelatedModels.push(
      ActivityReportObjective.update({
        originalObjectiveId: sequelize.fn('COALESCE', sequelize.col('originalObjectiveId'), aro.objectiveId),
        objectiveId: newObjective.id,
      }, {
        where: {
          id: aro.id,
        },
        individualHooks: true,
      }),
    );
  });

  return Promise.all(updatesToRelatedModels);
}

/**
 *
 * @param {*} childGoalWithObjectivesAndRelated
 * @param {number} parentGoalId
 */
export async function mergeObjectivesFromGoal(
  childGoalWithObjectivesAndRelated,
  parentGoalId,
) {
  return Promise.all(
    childGoalWithObjectivesAndRelated.objectives
      .map((objective) => mergeObjectiveFromGoal(objective, parentGoalId)),
  );
}

export function determineFinalGoalValues(selectedGoals, finalGoal) {
  // determine the final value of these fields
  const statuses = selectedGoals.map((goal) => goal.status);
  const finalStatus = determineMergeGoalStatus(statuses);
  const createdAtDates = selectedGoals.map((goal) => goal.createdAt);
  const finalCreatedAt = new Date(Math.min(...createdAtDates));
  const onAR = selectedGoals.map((goal) => goal.onAR).includes(true);

  return {
    name: finalGoal.name,
    goalTemplateId: finalGoal.goalTemplateId,
    createdAt: finalCreatedAt,
    endDate: finalGoal.endDate,
    createdVia: 'merge',
    onAR,
    rtrOrder: finalGoal.rtrOrder,
    source: finalGoal.source,
    isFromSmartsheetTtaPlan: finalGoal.isFromSmartsheetTtaPlan,
    status: finalStatus,
  };
}

/**
 *
 * @param {number} finalGoalId
 * @param {number[]} selectedGoalIds
 */

export async function mergeGoals(
  finalGoalId,
  selectedGoalIds,
  goalSimiliarityGroupId,
) {
  // create a new goal from "finalGoalId"
  // - update selectedGoalIds to point to newGoalId
  // - i.e. { parentGoalId: newGoalId }
  // - update goal template id
  // createdAt should be min date of all goals
  // update all the other goals to point to the new goal
  // - derive status from chart in AC
  const selectedGoals = await Goal.findAll({
    where: {
      id: uniq([finalGoalId, ...selectedGoalIds]),
    },
    include: [
      {
        model: ActivityReportGoal,
        as: 'activityReportGoals',
        attributes: [
          'id',
          'goalId',
        ],
      },
      {
        model: GoalFieldResponse,
        as: 'responses',
        attributes: ['id', 'goalTemplateFieldPromptId', 'response'],
      },
      {
        model: GoalResource,
        as: 'goalResources',
        attributes: ['id', 'resourceId'],
      },
      {
        model: Objective,
        as: 'objectives',
        include: [
          {
            model: ActivityReportObjective,
            as: 'activityReportObjectives',
            attributes: ['id', 'objectiveId'],
          },
        ],
      },
    ],
  });

  const finalGoal = selectedGoals.find((goal) => goal.id === parseInt(finalGoalId, DECIMAL_BASE));

  if (!finalGoal) {
    throw new Error(`Goal with id ${finalGoalId} not found in merge goals`);
  }

  const finalGoalValues = determineFinalGoalValues(selectedGoals, finalGoal);

  /**
  * we will need to create a "new" final goal for each grant involved
  * in this sordid business
  */

  const uniqueGrantIds = uniq(selectedGoals.map((goal) => goal.grantId));

  const grantsWithReplacements = await Grant.findAll({
    attributes: ['id', 'status'],
    where: {
      [Op.or]: [
        { id: uniqueGrantIds },
        { '$grantRelationships.grantId$': uniqueGrantIds },
      ],
    },
    include: [
      {
        model: GrantRelationshipToActive,
        as: 'grantRelationships',
        attributes: ['activeGrantId', 'grantId'],
        required: false,
        include: [
          {
            model: Grant,
            as: 'activeGrant',
            attributes: ['id', 'status'],
          },
        ],
      },
    ],
  });

  if (!grantsWithReplacements.length) {
    throw new Error('No active grants found to merge goals into');
  }

  const grantsWithReplacementsDictionary = {};

  grantsWithReplacements.forEach((grant) => {
    if (grant.status === 'Active') {
      if (Array.isArray(grantsWithReplacementsDictionary[grant.id])) {
        grantsWithReplacementsDictionary[grant.id].push(grant.id);
      } else {
        grantsWithReplacementsDictionary[grant.id] = [grant.id];
      }
    } else {
      grant.grantRelationships.forEach((relationship) => {
        if (relationship.activeGrant && relationship.activeGrant.status === 'Active') {
          if (Array.isArray(grantsWithReplacementsDictionary[grant.id])) {
            grantsWithReplacementsDictionary[grant.id].push(relationship.activeGrantId);
          } else {
            grantsWithReplacementsDictionary[grant.id] = [relationship.activeGrantId];
          }
        }
      });
    }
  });

  // unique list of grant IDs
  const grantIds = uniq(Object.values(grantsWithReplacementsDictionary).flat());

  const goalsToBulkCreate = grantIds.map((grantId) => ({
    ...finalGoalValues,
    grantId,
  }));

  // record the merge as complete
  await setSimilarityGroupAsUserMerged(
    goalSimiliarityGroupId,
    finalGoalId,
  );

  const newGoals = await Goal.bulkCreate(
    goalsToBulkCreate,
    {
      ignoreHooks: { name: 'autoPopulateCreator' },
      individualHooks: true,
    },
  );

  // we will need these in a moment
  const grantToGoalDictionary = {};
  newGoals.forEach((goal) => {
    grantToGoalDictionary[goal.grantId] = goal.id;
  });

  /* build goal sets for collaborator merge
  {
    newGoalId: number,
    sourceGoalIds: number[],
    selectedGoalId: number | null,
  }[]
  an array of objects, one for each grant
  newGoalId - the new goal created for the grant
  sourceGoalIds - an array of existing goals to be merged into the new goal
  selectedGoalId - the goal from the sourceGoalIds list for the current grant with the chosen text
  */
  const goalSets = selectedGoals.reduce((acc, selectedGoal) => {
    const goalSet = acc.find(({ newGoalId }) => newGoalId === grantToGoalDictionary[
      grantsWithReplacementsDictionary[selectedGoal.grantId]
    ]);
    goalSet.sourceGoalIds.push(selectedGoal.id);
    if (finalGoal.name === selectedGoal.name) {
      goalSet.selectedGoalId = selectedGoal.id;
    }
    return acc;
  }, newGoals.map((newGoal) => ({
    newGoalId: newGoal.id,
    sourceGoalIds: [],
    selectedGoalId: null,
  })));

  // update associated models
  // - update AR goals with originalGoalId and goalId with the new goalId
  // - update goalId on objectives
  // - copy existing objective, set mapsTo on existingObjective with new objectiveId
  // - update ARO with originalObjectiveId and objectiveId with the new objectiveId
  // - goalResources, copy
  // - goalFieldResponses, copy
  // - objective files, ETC

  await Promise.all(selectedGoals.map((g) => (
    // comment block above explains what this is doing
    // will use the most up-to-date grant ID as well
    mergeObjectivesFromGoal(g, grantToGoalDictionary[
      grantsWithReplacementsDictionary[g.grantId]
    ])
  )));

  const updatesToRelatedModels = [];

  goalSets.forEach(({
    newGoalId,
    sourceGoalIds,
    selectedGoalId,
  }) => {
    updatesToRelatedModels.push(mergeCollaborators(
      'goal',
      sequelize,
      null,
      newGoalId,
      sourceGoalIds,
      selectedGoalId,
    ));
  });

  selectedGoals.forEach((g) => {
    // update the activity report goal
    if (g.activityReportGoals.length) {
      updatesToRelatedModels.push(ActivityReportGoal.update(
        {
          originalGoalId: sequelize.fn('COALESCE', sequelize.col('originalGoalId'), g.id),
          goalId: grantToGoalDictionary[
            grantsWithReplacementsDictionary[g.grantId]
          ],
        },
        {
          where: { id: g.activityReportGoals.map((arg) => arg.id) },
        },
      ));

      // TODO: if the report is not approved, the name, resources and responses should also
      // be updated
    }

    // copy the goal resources
    g.goalResources.forEach(async (gr) => {
      updatesToRelatedModels.push(GoalResource.findOrCreate({
        where: {
          goalId: grantToGoalDictionary[
            grantsWithReplacementsDictionary[g.grantId]
          ],
          resourceId: gr.resourceId,
        },
        individualHooks: true,
      }));
    });

    if (Number(g.id) === Number(finalGoalId)) {
      // copy the goal field responses
      g.responses.forEach((gfr) => {
        Object.values(grantToGoalDictionary).forEach((goalId) => {
          updatesToRelatedModels.push(GoalFieldResponse.create({
            goalId,
            goalTemplateFieldPromptId: gfr.goalTemplateFieldPromptId,
            response: gfr.response,
          }, { individualHooks: true }));
        });
      });
    }
  });

  await Promise.all(updatesToRelatedModels);
  await Promise.all(selectedGoals.map((g) => {
    const u = g.update({
      mapsToParentGoalId: grantToGoalDictionary[
        grantsWithReplacementsDictionary[g.grantId]
      ],
    }, { individualHooks: true });
    return u;
  }));

  return newGoals;
}

export async function goalRegionsById(goalIds) {
  const grants = await Grant.findAll({
    attributes: ['regionId', 'id'],
    include: [{
      attributes: ['id', 'grantId'],
      model: Goal,
      as: 'goals',
      required: true,
      where: {
        id: goalIds,
      },
    }],
  });

  return uniq(grants.map((g) => g.regionId));
}
/**
 *
 * The shape of the data object is as follows:
 *
  // {
  //   region, // string
  //   group, // string, group ID
  //   createReport, // bool
  //   useCuratedGoal, // bool
  //   creator, // string, user ID
  //   templateId, // string, template ID
  //   goalPrompts, // array, as follows
  // [
  //   {
  //     promptId: 1,
  //     title: 'FEI root cause',
  //     fieldName: 'fei-root-cause'
  //   }
  // ],
  // 'fei-root-cause': [ 'Community Partnerships', 'Family Circumstances' ],
  // goalSource, // string
  // goalDate, // string
  // selectedGrants, // stringified JSON grant data
  // }
 * @param {FormData} data
 * @returns {
 *  goals: Goal[],
 *  data: FormData,
 *  activityReport: ActivityReport,
 *  isError: boolean,
 *  message: string,
 * }
 */
export async function createMultiRecipientGoalsFromAdmin(data) {
  const grantIds = JSON.parse(data.selectedGrants).map((g) => g.id);

  let templateId = null;
  let isError = false;
  let message = '';

  let grantsForWhomGoalAlreadyExists = [];
  if (data.useCuratedGoal && data.templateId) {
    templateId = Number(data.templateId);
  }

  let template;

  if (templateId) {
    template = await GoalTemplate.findByPk(templateId);
  }

  let name = data.goalText;

  if (template) {
    name = template.templateName;
  }

  if (!name) {
    isError = true;
    message = 'Goal name is required';
  }

  let goalsForNameCheck = [];

  if (!isError && grantIds.length > 0) {
    goalsForNameCheck = await Goal.findAll({
      attributes: [
        'id',
        'grantId',
      ],
      include: [
        {
          model: Grant,
          attributes: ['number'],
          as: 'grant',
        },
      ],
      where: {
        grantId: grantIds,
        name,
      },
    });

    grantsForWhomGoalAlreadyExists = goalsForNameCheck.map((g) => g.grantId);
  }

  if (goalsForNameCheck.length) {
    message = `A goal with that name already exists for grants ${goalsForNameCheck.map((g) => g.grant.number).join(', ')}`;
  }

  if (goalsForNameCheck.length && !data.createMissingGoals) {
    isError = true;
  }

  if (isError) {
    return {
      isError,
      message,
      grantsForWhomGoalAlreadyExists,
    };
  }

  let endDate = null;

  if (data.goalDate) {
    endDate = data.goalDate;
  }

  const grantsToCreateGoalsFor = grantIds.filter(
    (g) => !grantsForWhomGoalAlreadyExists.includes(g),
  );

  const goals = await Goal.bulkCreate(grantsToCreateGoalsFor.map((grantId) => ({
    name,
    grantId,
    source: data.goalSource || null,
    endDate,
    status: GOAL_STATUS.NOT_STARTED,
    createdVia: 'admin',
    goalTemplateId: template ? template.id : null,
  })), { individualHooks: true });

  const goalIds = goals.map((g) => g.id);

  const promptResponses = (data.goalPrompts || []).map((goalPrompt) => {
    const response = data[goalPrompt.fieldName];

    return {
      promptId: goalPrompt.promptId,
      response,
    };
  }).filter((pr) => pr.response);

  if (data.useCuratedGoal && promptResponses && promptResponses.length) {
    await setFieldPromptsForCuratedTemplate(goalIds, promptResponses);
  }

  let activityReport = null;

  if (data.createReport && data.creator) {
    const reportData = {
      activityType: [],
      additionalNotes: null,
      collaborators: [],
      context: '',
      deliveryMethod: null,
      endDate: null,
      recipients: [],
      numberOfParticipants: null,
      otherResources: [],
      participantCategory: '',
      participants: [],
      reason: [],
      requester: '',
      startDate: null,
      calculatedStatus: REPORT_STATUSES.DRAFT,
      submissionStatus: REPORT_STATUSES.DRAFT,
      targetPopulations: [],
      topics: [],
      regionId: Number(data.region),
      userId: Number(data.creator),
      activityRecipientType: 'recipient',
      pageState: {
        1: 'Not started',
        2: 'Not started',
        3: 'Not started',
        4: 'Not started',
      },
    };

    activityReport = await ActivityReport.create(reportData);

    await Promise.all([
      ActivityReportGoal.bulkCreate([
        ...goalIds,
        ...goalsForNameCheck.map((g) => g.id),
      ].map((goalId) => ({
        activityReportId: activityReport.id,
        goalId,
        isActivelyEdited: true,
        status: GOAL_STATUS.NOT_STARTED,
        name,
        source: data.goalSource || null,
      })), { individualHooks: true }),
      ActivityRecipient.bulkCreate(grantIds.map((grantId) => ({
        activityReportId: activityReport.id,
        grantId,
      })), { individualHooks: true }),
    ]);
  }

  return {
    goals,
    data,
    activityReport,
    isError,
    message,
    grantsForWhomGoalAlreadyExists,
  };
}

/*
Exampled request body, the data param:
 * {
  "closeSuspendReason": "Duplicate goal",
  "closeSuspendReasonContext": "sdf",
  "selectedGoal": {
    "endDate": "03/17/2023",
    "grantIds": [
      10839
    ],
    "goalIds": [
      47344
    ],
    "oldGrantIds": [
      7965
    ],
    "created": "2023-03-18T21:56:38.003Z",
    "goalTemplateId": null,
    "name": "The recipient will attend the Back to the Basics: Safety First Training. ",
    "status": "In Progress",
    "onApprovedAR": true,
    "source": null,
    "isCurated": null,
    "id": "goal_83"
  }
}
 */
export async function closeMultiRecipientGoalsFromAdmin(data, userId) {
  const {
    selectedGoal,
    closeSuspendContext,
    closeSuspendReason,
  } = data;

  const { goalIds, status } = selectedGoal;

  /**
   * 1) Complete all objectives that have been
   * on an approved AR
   */

  await Objective.update({
    status: OBJECTIVE_STATUS.COMPLETE,
    closeSuspendReason,
    closeSuspendContext,
  }, {
    where: {
      goalId: goalIds,
      onApprovedAR: true,
    },
    individualHooks: true,
  });

  /**
   * 2) Close all goals with reason and context
   */

  return {
    isError: false,
    goals: await updateGoalStatusById(
      goalIds,
      userId,
      status,
      GOAL_STATUS.CLOSED,
      closeSuspendReason,
      closeSuspendContext,
      [GOAL_STATUS.CLOSED],
    ),
  };
}
