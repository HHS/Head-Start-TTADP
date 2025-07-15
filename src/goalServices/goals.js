import { Op } from 'sequelize';
import { uniq } from 'lodash';
import {
  DECIMAL_BASE,
  REPORT_STATUSES,
} from '@ttahub/common';
import {
  Goal,
  GoalFieldResponse,
  GoalTemplate,
  GoalStatusChange,
  Grant,
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
  Program,
  ActivityReportObjectiveCitation,
} from '../models';
import {
  OBJECTIVE_STATUS,
  GOAL_STATUS,
  SOURCE_FIELD,
  CREATION_METHOD,
} from '../constants';
import { setFieldPromptsForCuratedTemplate } from '../services/goalTemplates';
import { auditLogger } from '../logger';
import changeGoalStatus from './changeGoalStatus';
import goalsByIdAndRecipient, {
  OBJECTIVE_ATTRIBUTES_TO_QUERY_ON_RTR,
} from './goalsByIdAndRecipient';
import getGoalsForReport from './getGoalsForReport';
import { reduceGoals } from './reduceGoals';
import extractObjectiveAssociationsFromActivityReportObjectives from './extractObjectiveAssociationsFromActivityReportObjectives';
import wasGoalPreviouslyClosed from './wasGoalPreviouslyClosed';
import {
  saveStandardGoalsForReport,
} from '../services/standardGoals';

// the page state location of the goals and objective page
// on the frontend/ActivityReportForm
const GOALS_AND_OBJECTIVES_PAGE = '2';
const NOT_STARTED_SENTENCE_CASE = 'Not started';
const IN_PROGRESS_SENTENCE_CASE = 'In progress';

const namespace = 'SERVICE:GOALS';
const logContext = {
  namespace,
};

/**
 * Maps grants to their active replacements.
 *
 * This function iterates through a list of grants and constructs a dictionary
 * where each grant ID is associated with an array of active grant IDs. If the
 * grant itself is active, it maps to its own ID. If the grant is not active,
 * but has relationships with active grants, it maps to those active grants instead.
 *
 * @param {Array} grants - An array of grant objects. Each grant object should have
 *   properties `id`, `status`, and an optional array of `grantRelationships`. Each
 *   relationship should contain an `activeGrant` object with `id` and `status`.
 * @returns {Object} A dictionary where the keys are grant IDs and the values are
 *   arrays of active grant IDs related to each key grant.
 */
export function mapGrantsWithReplacements(grants) {
  const grantsWithReplacementsDictionary = {};

  grants.forEach((grant) => {
    if (grant.status === 'Active') {
      if (Array.isArray(grantsWithReplacementsDictionary[grant.id])) {
        grantsWithReplacementsDictionary[grant.id].push(grant.id);
      } else {
        grantsWithReplacementsDictionary[grant.id] = [grant.id];
      }
    } else if (Array.isArray(grant.grantRelationships)) {
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

  return grantsWithReplacementsDictionary;
}

/**
 *
 * @param {number} id
 * @returns {Promise{Object}}
 */
export async function goalsByIdsAndActivityReport(goalIds, activityReportId) {
  const goals = await Goal.findAll({
    attributes: [
      'status',
      ['id', 'value'],
      ['name', 'label'],
      'id',
      'name',
      'isSourceEditable',
      'onApprovedAR',
      'source',
    ],
    where: {
      id: goalIds,
    },
    include: [
      {
        model: GoalTemplate,
        as: 'goalTemplate',
        attributes: [],
      },
      {
        model: Grant,
        as: 'grant',
        include: [
          {
            model: Program,
            as: 'programs',
            attributes: [],
          },
        ],
      },
      {
        model: Objective,
        as: 'objectives',
        where: {
          title: {
            [Op.ne]: '',
          },
          [Op.or]: [
            { createdVia: 'rtr' },
            {
              [Op.and]: [
                { createdVia: 'activityReport' },
                { onApprovedAR: true },
              ],
            },
            {
              [Op.and]: [
                { createdVia: 'activityReport' },
                // eslint-disable-next-line max-len
                { createdViaActivityReportId: activityReportId }, // This is the report that created the objective.
              ],
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
                attributes: ['id', 'name'],
                through: {
                  attributes: [],
                },
              },
              {
                model: ActivityReportObjectiveCitation,
                as: 'activityReportObjectiveCitations',
                attributes: ['citation', 'monitoringReferences'],
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
            where: { goalId: goalIds },
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
              where: { goalId: goalIds, activityReportId },
            }],
          },
        ],
      },
    ],
  });

  const reformattedGoals = goals.map((goal) => ({
    ...goal,
    isSourceEditable: goal.isSourceEditable,
    isReopenedGoal: wasGoalPreviouslyClosed(goal),
    onApprovedAR: goal.onApprovedAR,
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
        citations: extractObjectiveAssociationsFromActivityReportObjectives(
          objective.activityReportObjectives,
          'activityReportObjectiveCitations',
        ),
      })),
  }));

  const reducedGoals = reduceGoals(reformattedGoals) || [];

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
  const goal = await Goal.findOne({
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
    regionId,
    recipientId,

  The goal model has the following columns
    id,
    name,
    status,
    timeframe,
    isFromSmartsheetTtaPlan

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
      status,
      prompts,
      isCurated,
      source,
      goalTemplateId,
      skipObjectiveCleanup,
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

      if (status && newGoal.status !== status) {
        newGoal.set({ status });
      }
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
              title: title.trim(),
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
    // we can pass a flag to skip this if we are updating the goal without changing objectives
    if (!skipObjectiveCleanup) {
      await cleanupObjectivesForGoal(newGoal.id, newObjectives);
    }

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
  const grants = await Grant.unscoped().findAll({
    attributes: [
      'id',
      [sequelize.fn(
        'ARRAY_AGG',
        sequelize.fn(
          'DISTINCT',
          sequelize.col('grantRelationships.grantId'),
        ),
      ), 'oldGrantIds'],
    ],
    where: {
      id: grantIds,
    },
    include: [{
      model: GrantRelationshipToActive,
      as: 'grantRelationships',
      required: false,
      attributes: [],
    }],
    group: ['"Grant".id'],
  });

  const curatedTemplates = await GoalTemplate.findAll({
    attributes: ['id'],
    where: {
      creationMethod: CREATION_METHOD.CURATED,
    },
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
          sequelize.col('grant.grantRelationships.grantId'),
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
      'source',
      'createdVia',
    ],
    group: [
      '"Goal"."name"',
      '"Goal"."status"',
      '"Goal"."onApprovedAR"',
      '"Goal"."source"',
      '"Goal"."createdVia"',
      '"Goal".id',
    ],
    where: {
      name: {
        [Op.ne]: '', // exclude "blank" goals
      },
      [Op.or]: {
        '$grant.id$': ids,
        '$grant.grantRelationships.grantId$': ids,
        '$grant.grantRelationships.activeGrantId$': ids,
      },
      status: {
        [Op.notIn]: ['Closed', 'Suspended'],
      },
      goalTemplateId: {
        [Op.or]: [
          {
            [Op.notIn]: curatedTemplates.map((ct) => ct.id),
          },
          {
            [Op.is]: null,
          },
        ],
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

export async function setActivityReportGoalAsActivelyEdited(goalIdsAsString, reportId, pageState) {
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
        [GOALS_AND_OBJECTIVES_PAGE]: IN_PROGRESS_SENTENCE_CASE,
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
export async function createOrUpdateGoalsForActivityReport(goals, reportId, userId) {
  const activityReportId = parseInt(reportId, DECIMAL_BASE);
  const report = (await ActivityReport.findByPk(activityReportId)).toJSON();

  // Save the standard goals for the report.
  await saveStandardGoalsForReport(goals, userId, report);

  // updating the goals is updating the report, sorry everyone
  // let us consult the page state by taking a shallow copy
  const pageState = { ...report.pageState };

  if (pageState[GOALS_AND_OBJECTIVES_PAGE] === NOT_STARTED_SENTENCE_CASE) {
    // we also need to update the activity report page state
    await ActivityReport.update({
      pageState: {
        ...pageState,
        [GOALS_AND_OBJECTIVES_PAGE]: IN_PROGRESS_SENTENCE_CASE,
      },
    }, {
      where: {
        id: reportId,
      },
    });
  } else {
    // note that for some reason (probably sequelize automagic)
    // both model.update() and model.set() + model.save() do NOT update the updatedAt field
    // even if you explicitly set it in the update or save to the current new Date()
    // hence the following raw query:
    await sequelize.query(`UPDATE "ActivityReports" SET "updatedAt" = '${new Date().toISOString()}' WHERE id = ${activityReportId}`);
  }

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

/**
*
* key is activityReportid, value is count of goals on that report
* @param {{ number: { number: number } }} countObject
*/
// eslint-disable-next-line max-len
export const hasMultipleGoalsOnSameActivityReport = (countObject) => Object.values(countObject)
  .some((grants) => Object.values(grants).some((c) => c > 1));

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
    message = `A goal with that name already exists for grants ${goalsForNameCheck
      .map((g) => (g.grant ? g.grant.number : 'Unknown'))
      .join(', ')}`;
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

  const grantsToCreateGoalsFor = grantIds.filter(
    (g) => !grantsForWhomGoalAlreadyExists.includes(g),
  );

  const goals = await Goal.bulkCreate(grantsToCreateGoalsFor.map((grantId) => ({
    name,
    grantId,
    source: data.goalSource || null,
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
