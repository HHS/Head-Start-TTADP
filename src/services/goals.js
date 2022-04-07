/* eslint-disable no-unused-vars */
import { Op } from 'sequelize';
import { auditLogger } from '../logger';
import {
  Goal,
  Grant,
  Objective,
  ObjectiveResource,
  ObjectiveTopic,
  ActivityReportObjective,
  GrantGoal,
  Recipient,
  ActivityReport,
  Topic,
  sequelize,
} from '../models';
import { DECIMAL_BASE, REPORT_STATUSES } from '../constants';

const namespace = 'SERVICE:GOALS';

const logContext = {
  namespace,
};

export async function goalById(id, recipientId) {
  return Goal.findOne({
    attributes: [
      'id',
      'endDate',
      ['name', 'goalName'],
      'status',
    ],
    where: {
      id,
    },
    include: [
      {
        attributes: [
          'title',
          'id',
          'status',
        ],
        model: Objective,
        as: 'objectives',
        include: [
          {
            model: ObjectiveResource,
            as: 'resources',
            attributes: [
              ['userProvidedUrl', 'value'],
              ['id', 'key'],
            ],
          },
          {
            model: Topic,
            as: 'topics',
            attributes: [
              ['id', 'value'],
              ['name', 'label'],
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
        model: Grant,
        as: 'grants',
        attributes: [
          'id',
        ],
        include: [
          {
            model: Recipient,
            as: 'recipient',
            where: {
              id: recipientId,
            },
            required: true,
          },
        ],
      },
    ],
  });
}

export async function goalByIdWithActivityReportsAndRegions(goalId) {
  return Goal.findOne({
    attributes: ['name', 'id', 'status'],
    where: {
      id: goalId,
    },
    include: [
      {
        model: Grant,
        as: 'grants',
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
  });

  const orphanedObjectiveIds = orphanedObjectives.map((objective) => objective.id);

  await ObjectiveResource.destroy({
    where: {
      objectiveId: orphanedObjectiveIds,
    },
  });

  await ObjectiveTopic.destroy({
    where: {
      objectiveId: orphanedObjectiveIds,
    },
  });

  return Objective.destroy({
    where: {
      id: orphanedObjectiveIds,
    },
  });
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
  // per a discussion with Patrice, we are disabling the backend "for real"
  // for now
  return goals;

  // return sequelize.transaction(async (transaction) => Promise.all(goals.map(async (goalData) => {
  //   const {
  //     id, grants, recipientId, regionId, objectives,
  //     ...fields
  //   } = goalData;

  //   const options = {
  //     ...fields,
  //     isFromSmartsheetTtaPlan: false,
  //     id: id === 'new' ? null : id,
  //   };

  //   const [goal] = await Goal.upsert(options, { transaction });

  //   const grantGoals = await Promise.all(
  //     grants.map((grant) => GrantGoal.findOrCreate({
  //       where: {
  //         goalId: goal.id,
  //         recipientId,
  //         grantId: grant.value,
  //       },
  //       transaction,
  //     })),
  //   );

  //   const grantGoalIds = grantGoals.map((gg) => gg.id);

  //   // cleanup grant goals
  //   await GrantGoal.destroy({
  //     where: {
  //       id: {
  //         [Op.notIn]: grantGoalIds,
  //       },
  //       goalId: goal.id,
  //     },
  //   });

  //   const newObjectives = await Promise.all(
  //     objectives.map(async (o) => {
  //       const {
  //         id: objectiveId,
  //         resources,
  //         topics,
  //         ...objectiveFields
  //       } = o;

  //       const where = parseInt(objectiveId, DECIMAL_BASE) ? {
  //         id: objectiveId,
  //         goalId: goal.id,
  //         ...objectiveFields,
  //       } : {
  //         goalId: goal.id,
  //         title: o.title,
  //         ttaProvided: '',
  //         status: 'Not started',
  //       };

  //       const [objective] = await Objective.upsert(
  //         where,
  //         { transaction },
  //       );

  //       // topics
  //       const objectiveTopics = await Promise.all(
  //          (topics.map((ot) => ObjectiveTopic.findOrCreate({
  //         where: {
  //           objectiveId: objective.id,
  //           topicId: ot.value,
  //         },
  //         transaction,
  //       }))));

  //       // cleanup objective topics
  //       await ObjectiveTopic.destroy({
  //         where: {
  //           id: {
  //             [Op.notIn]: objectiveTopics.length ? objectiveTopics.map(([ot]) => ot.id) : [],
  //           },
  //           objectiveId: objective.id,
  //         },
  //       });

  //       // resources
  //       const objectiveResources = await Promise.all(
  //         resources.filter(({ value }) => value).map(
  //            ({ value }) => ObjectiveResource.findOrCreate({
  //           where: {
  //             userProvidedUrl: value,
  //             objectiveId: objective.id,
  //           },
  //           transaction,
  //         })),
  //       );

  //       // cleanup objective resources
  //       await ObjectiveResource.destroy({
  //         where: {
  //           id: {
  //             [Op.notIn]: objectiveResources.length ?
  // objectiveResources.map(([or]) => or.id) : [],
  //           },
  //           objectiveId: objective.id,
  //         },
  //       });

  //       return {
  //         ...objective.dataValues,
  //         topics,
  //         resources,
  //       };
  //     }),
  //   );

  //   // this function deletes unused objectives
  //   await cleanupObjectivesForGoal(goal.id, newObjectives);

  //   // we want to return the data in roughly the form it was provided
  //   return {
  //     ...goal.dataValues,
  //     grants,
  //     recipientId,
  //     regionId,
  //     objectives: newObjectives,
  //   };
  // })));
}

export async function goalsForGrants(grantIds) {
  /**
   * get all the matching grants
   */
  const grants = await Grant.findAll({
    attributes: ['id', 'oldGrantId'],
    where: {
      id: grantIds,
    },
  });

  /**
   * we need one big array that includes the old recipient id as well,
   * removing all the nulls along the way
   */
  const ids = grants
    .reduce((previous, current) => [...previous, current.id, current.oldGrantId], [])
    .filter((g) => g != null);

  /*
  * finally, return all matching goals
  */

  return Goal.findAll({
    where: {
      [Op.or]: [
        {
          status: 'Not Started',
        },
        {
          status: 'In Progress',
        },
        {
          status: null,
        },
      ],
    },
    include: [
      {
        model: Grant,
        as: 'grants',
        attributes: ['id'],
        where: {
          id: ids,
        },
      },
    ],
    order: ['createdAt'],
  });
}

async function removeActivityReportObjectivesFromReport(reportId, transaction) {
  return ActivityReportObjective.destroy({
    where: {
      activityReportId: reportId,
    },
    transaction,
  });
}

export async function removeGoals(goalsToRemove, transaction) {
  const goalsWithGrants = await Goal.findAll({
    attributes: ['id'],
    where: {
      id: goalsToRemove,
    },
    include: {
      attributes: ['id'],
      model: Grant,
      as: 'grants',
      required: true,
    },
    transaction,
  });

  const goalIdsToKeep = goalsWithGrants.map((g) => g.id);
  const goalsWithoutGrants = goalsToRemove.filter((id) => !goalIdsToKeep.includes(id));

  return Goal.destroy({
    where: {
      id: goalsWithoutGrants,
    },
    transaction,
  });
}

async function removeObjectives(currentObjectiveIds, transaction) {
  return Objective.destroy({
    where: {
      id: currentObjectiveIds,
    },
    transaction,
  });
}

async function removeUnusedObjectivesGoalsFromReport(reportId, currentGoals, transaction) {
  const previousObjectives = await ActivityReportObjective.findAll({
    where: {
      activityReportId: reportId,
    },
    include: {
      model: Objective,
      as: 'objective',
    },
  });

  const currentGoalIds = currentGoals.map((g) => g.id);
  const currentObjectiveIds = currentGoals.map((g) => g.objectives.map((o) => o.id)).flat();

  const previousGoalIds = previousObjectives.map((ro) => ro.objective.goalId);
  const previousObjectiveIds = previousObjectives.map((ro) => ro.objectiveId);

  const goalIdsToRemove = previousGoalIds.filter((id) => !currentGoalIds.includes(id));
  const objectiveIdsToRemove = [];
  await Promise.all(
    previousObjectiveIds.map(async (id) => {
      const notCurrent = !currentObjectiveIds.includes(id);
      const activityReportObjectives = await ActivityReportObjective
        .findAll({ where: { objectiveId: id } });
      const lastInstance = activityReportObjectives.length <= 1;
      if (notCurrent && lastInstance) {
        objectiveIdsToRemove.push(id);
      }
    }),
  );

  await removeActivityReportObjectivesFromReport(reportId, transaction);
  await removeObjectives(objectiveIdsToRemove, transaction);
  await removeGoals(goalIdsToRemove, transaction);
}

export async function saveGoalsForReport(goals, report, transaction) {
  await removeUnusedObjectivesGoalsFromReport(report.id, goals, transaction);

  return Promise.all(goals.map(async (goal) => {
    const goalId = goal.id;
    const fields = goal;

    if (!Number.isInteger(goalId)) {
      delete fields.id;
    }

    // using upsert here and below
    // - add returning: true to options to get an array of [<Model>,<created>] (postgres only)
    // - https://sequelize.org/v5/class/lib/model.js~Model.html#static-method-upsert

    const newGoal = await Goal.upsert(fields, { returning: true, transaction });

    return Promise.all(goal.objectives.map(async (objective) => {
      const { id, ...updatedFields } = objective;
      const updatedObjective = { ...updatedFields, goalId: newGoal[0].id };

      if (Number.isInteger(id)) {
        updatedObjective.id = id;
      }

      const savedObjective = await Objective.upsert(
        updatedObjective,
        { returning: true, transaction },
      );

      return ActivityReportObjective.create({
        objectiveId: savedObjective[0].id,
        activityReportId: report.id,
      }, { transaction });
    }));
  }));
}

export async function copyGoalsToGrants(goals, grantIds, transaction) {
  const grants = await Grant.findAll({
    where: {
      id: grantIds,
    },
  });

  const grantGoals = [];
  goals.forEach((goal) => {
    grants.forEach((grant) => {
      grantGoals.push({
        grantId: grant.id,
        recipientId: grant.recipientId,
        goalId: goal.id,
      });
    });
  });

  await GrantGoal.bulkCreate(grantGoals, {
    ignoreDuplicates: true,
    transaction,
  });
}

export async function updateGoalStatusById(
  goalId,
  oldStatus,
  newStatus,
  closeSuspendReason,
  closeSuspendContext,
) {
  /* TODO:
    Disable for now until goals are unique grants. ?????
  */

  return sequelize.transaction(async (transaction) => {
    const updatedGoal = await Goal.update(
      {
        status: newStatus,
        closeSuspendReason,
        closeSuspendContext,
        previousStatus: oldStatus,
      },
      { where: { id: goalId }, returning: true, transaction },
    );
    return updatedGoal[1][0];
  });
}

export async function destroyGoal(goalId) {
  return goalId;
  // return sequelize.transaction(async (transaction) => {
  //   try {
  //     const reportsWithGoal = await ActivityReport.findAll({
  //       attributes: ['id'],
  //       include: [
  //         {
  //           attributes: ['id'],
  //           model: Objective,
  //           required: true,
  //           as: 'objectivesWithGoals',
  //           include: [
  //             {
  //               attributes: ['id'],
  //               model: Goal,
  //               required: true,
  //               where: {
  //                 id: goalId,
  //               },
  //               as: 'goal',
  //             },
  //           ],
  //         },
  //       ],
  //       transaction,
  //       raw: true,
  //     });

  //     const isOnReport = reportsWithGoal.length;
  //     if (isOnReport) {
  //       throw new Error('Goal is on an activity report and can\'t be deleted');
  //     }

  //     const objectiveTopicsDestroyed = await ObjectiveTopic.destroy({
  //       where: {
  //         objectiveId: {
  //           [Op.in]: sequelize.literal(
  //             `(SELECT "id" FROM "Objectives" WHERE "goalId" = ${sequelize.escape(goalId)})`,
  //           ),
  //         },
  //       },
  //       transaction,
  //     });

  //     const objectiveResourcesDestroyed = await ObjectiveResource.destroy({
  //       where: {
  //         objectiveId: {
  //           [Op.in]: sequelize.literal(
  //             `(SELECT "id" FROM "Objectives" WHERE "goalId" = ${sequelize.escape(goalId)})`,
  //           ),
  //         },
  //       },
  //       transaction,
  //     });

  //     const objectivesDestroyed = await Objective.destroy({
  //       where: {
  //         goalId,
  //       },
  //       transaction,
  //     });

  //     const grantGoalsDestroyed = await GrantGoal.destroy({
  //       where: {
  //         goalId,
  //       },
  //       transaction,
  //     });

  //     const goalsDestroyed = await Goal.destroy({
  //       where: {
  //         id: goalId,
  //       },
  //       transaction,
  //     });

  //     return {
  //       goalsDestroyed,
  //       grantGoalsDestroyed,
  //       objectiveResourcesDestroyed,
  //       objectiveTopicsDestroyed,
  //       objectivesDestroyed,
  //     };
  //   } catch (error) {
  //     auditLogger.error(
  //  `${logContext.namespace} - Sequelize error - unable to delete from db - ${error}`
  //  );
  //     return 0;
  //   }
  // });
}
