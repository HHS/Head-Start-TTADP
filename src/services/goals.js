import { Op } from 'sequelize';
import {
  Goal,
  Grant,
  Objective,
  ObjectiveResource,
  ObjectiveTopic,
  ActivityReportObjective,
  sequelize,
  Recipient,
  ActivityReport,
  ActivityReportGoal,
  Topic,
  Program,
  File,
  ObjectiveRole,
  Role,
} from '../models';
import { DECIMAL_BASE, REPORT_STATUSES } from '../constants';

const OPTIONS_FOR_GOAL_FORM_QUERY = (id, recipientId) => ({
  attributes: [
    'id',
    'endDate',
    ['name', 'goalName'],
    'status',
    [sequelize.col('grant.regionId'), 'regionId'],
    [sequelize.col('grant.recipient.id'), 'recipientId'],
    'goalNumber',
    [
      sequelize.literal(`
        (
          SELECT COUNT("ar"."id") FROM "ActivityReports" "ar"
          INNER JOIN "ActivityReportGoals" "arg" ON "arg"."activityReportId" = "ar"."id"
          WHERE "arg"."goalId" = "Goal"."id"         
        ) > 0
      `),
      'onAnyReport',
    ],
    'onApprovedAR',
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
        'onApprovedAR',
        [
          sequelize.literal(`
            (
              SELECT COUNT("ar"."id") FROM "ActivityReports" "ar"
              INNER JOIN "ActivityReportObjectives" "aro" ON "aro"."activityReportId" = "ar"."id"
              WHERE "aro"."objectiveId" = "objectives"."id"         
            ) > 0
          `),
          'onAnyReport',
        ],
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
            [
              sequelize.literal(`
                (
                  SELECT COUNT("ar"."id") FROM "ActivityReports" "ar"
                  INNER JOIN "ActivityReportObjectives" "aro" ON "aro"."activityReportId" = "ar"."id"
                  INNER JOIN "Objectives" "o" ON "o"."id" = "aro"."objectiveId"
                  INNER JOIN "ObjectiveResources" "or" ON "or"."objectiveId" = "o"."id"      
                  WHERE "o"."id" = "objectives"."id" 
                  AND "or"."id" = "objectives->resources"."id"
                ) > 0
              `),
              'onAnyReport',
            ],
            [
              sequelize.literal(`
                (
                  SELECT COUNT("ar"."id") FROM "ActivityReports" "ar"
                  INNER JOIN "ActivityReportObjectives" "aro" ON "aro"."activityReportId" = "ar"."id"
                  INNER JOIN "Objectives" "o" ON "o"."id" = "aro"."objectiveId"
                  INNER JOIN "ObjectiveResources" "or" ON "or"."objectiveId" = "o"."id"      
                  WHERE "o"."id" = "objectives"."id" 
                  AND "or"."id" = "objectives->resources"."id"
                  AND "ar"."calculatedStatus" = '${REPORT_STATUSES.APPROVED}'
                ) > 0
              `),
              'isOnApprovedReport',
            ],
          ],
        },
        {
          model: Topic,
          as: 'topics',
          attributes: [
            ['id', 'value'],
            ['name', 'label'],
            [
              sequelize.literal(`
                (
                  SELECT COUNT("ar"."id") FROM "ActivityReports" "ar"
                  INNER JOIN "ActivityReportObjectives" "aro" ON "aro"."activityReportId" = "ar"."id"
                  INNER JOIN "Objectives" "o" ON "o"."id" = "aro"."objectiveId"
                  INNER JOIN "ObjectiveTopics" "ot" ON "ot"."objectiveId" = "o"."id"      
                  WHERE "o"."id" = "objectives"."id" 
                  AND "ot"."topicId" = "objectives->topics"."id"
                ) > 0
              `),
              'onAnyReport',
            ],
            [
              sequelize.literal(`
                (
                  SELECT COUNT("ar"."id") FROM "ActivityReports" "ar"
                  INNER JOIN "ActivityReportObjectives" "aro" ON "aro"."activityReportId" = "ar"."id"
                  INNER JOIN "Objectives" "o" ON "o"."id" = "aro"."objectiveId"
                  INNER JOIN "ObjectiveTopics" "ot" ON "ot"."objectiveId" = "o"."id"      
                  WHERE "o"."id" = "objectives"."id" 
                  AND "ot"."topicId" = "objectives->topics"."id"
                  AND "ar"."calculatedStatus" = '${REPORT_STATUSES.APPROVED}'
                ) > 0
              `),
              'isOnApprovedReport',
            ],
          ],
        },
        {
          model: File,
          as: 'files',
        },
        {
          model: Role,
          as: 'roles',
          attributes: [
            'fullName',
            [
              sequelize.literal(`
                (
                  SELECT COUNT("ar"."id") FROM "ActivityReports" "ar"
                  INNER JOIN "ActivityReportObjectives" "aro" ON "aro"."activityReportId" = "ar"."id"
                  INNER JOIN "Objectives" "o" ON "o"."id" = "aro"."objectiveId"
                  INNER JOIN "ObjectiveRoles" "or" ON "or"."objectiveId" = "o"."id"      
                  WHERE "o"."id" = "objectives"."id" 
                  AND "or"."roleId" = "objectives->roles"."id"
                ) > 0
              `),
              'onAnyReport',
            ],
            [
              sequelize.literal(`
                (
                  SELECT COUNT("ar"."id") FROM "ActivityReports" "ar"
                  INNER JOIN "ActivityReportObjectives" "aro" ON "aro"."activityReportId" = "ar"."id"
                  INNER JOIN "Objectives" "o" ON "o"."id" = "aro"."objectiveId"
                  INNER JOIN "ObjectiveRoles" "or" ON "or"."objectiveId" = "o"."id"      
                  WHERE "o"."id" = "objectives"."id" 
                  AND "or"."roleId" = "objectives->roles"."id"
                  AND "ar"."calculatedStatus" = '${REPORT_STATUSES.APPROVED}'
                ) > 0
              `),
              'isOnApprovedReport',
            ],
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
      as: 'grant',
      attributes: [
        'id',
        'number',
        'regionId',
        'recipientId',
      ],
      include: [
        {
          attributes: ['programType'],
          model: Program,
          as: 'programs',
        },
        {
          attributes: ['id'],
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

function reduceObjectives(newObjectives, currentObjectives = []) {
  return newObjectives.reduce((objectives, objective) => {
    const exists = objectives.find((o) => (
      o.title === objective.title && o.status === objective.status
    ));

    if (exists) {
      exists.ids = [...exists.ids, objective.id];
      return objectives;
    }

    // since this method is used to rollup both objectives on and off activity reports
    // we need to handle the case where there is TTA provided and TTA not provided
    // NOTE: there will only be one activity report objective, it is queried by activity report id
    const ttaProvided = objective.activityReportObjectives
        && objective.activityReportObjectives[0]
        && objective.activityReportObjectives[0].ttaProvided
      ? objective.activityReportObjectives[0].ttaProvided : null;

    const roles = objective.roles.map((role) => role.fullName);

    return [...objectives, {
      ...objective.dataValues,
      value: objective.id,
      ids: [objective.id],
      ttaProvided,
      isNew: false,
      roles,
    }];
  }, currentObjectives);
}

/**
 * Dedupes goals by name + status, as well as objectives by title + status
 * @param {Object[]} goals
 * @returns {Object[]} array of deduped goals
 */
function reduceGoals(goals) {
  return goals.reduce((previousValue, currentValue) => {
    const existingGoal = previousValue.find((g) => (
      g.name === currentValue.name && g.status === currentValue.status
    ));

    if (existingGoal) {
      existingGoal.goalNumbers = [...existingGoal.goalNumbers, currentValue.goalNumber];
      existingGoal.goalIds = [...existingGoal.goalIds, currentValue.id];
      existingGoal.grants = [
        ...existingGoal.grants,
        {
          ...currentValue.grant.dataValues,
          recipient: currentValue.grant.recipient.dataValues,
          name: currentValue.grant.name,
        },
      ];
      existingGoal.grantIds = [...existingGoal.grantIds, currentValue.grant.id];
      existingGoal.objectives = reduceObjectives(currentValue.objectives, existingGoal.objectives);
      return previousValue;
    }

    const goal = {
      ...currentValue.dataValues,
      goalNumbers: [currentValue.goalNumber],
      goalIds: [currentValue.id],
      grants: [
        {
          ...currentValue.grant.dataValues,
          recipient: currentValue.grant.recipient.dataValues,
          name: currentValue.grant.name,
        },
      ],
      grantIds: [currentValue.grant.id],
      objectives: reduceObjectives(currentValue.objectives),
      isNew: false,
    };

    return [...previousValue, goal];
  }, []);
}

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
                [Op.notIn]: ['Complete', 'Draft'],
              },
            },
          ],
        },
        attributes: [
          'id',
          ['title', 'label'],
          'title',
          'status',
        ],
        required: false,
        include: [
          {
            model: ObjectiveResource,
            as: 'resources',
            attributes: [
              ['userProvidedUrl', 'value'],
              ['id', 'key'],
            ],
            required: false,
          },
          {
            model: ActivityReportObjective,
            as: 'activityReportObjectives',
            attributes: [
              'ttaProvided',
            ],
            required: false,
            where: {
              activityReportId,
            },
          },
          {
            model: Role,
            as: 'roles',
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
    ],
  });

  return reduceGoals(goals);
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
            model: ObjectiveResource,
            as: 'resources',
            attributes: [
              ['userProvidedUrl', 'value'],
              ['id', 'key'],
            ],
            required: false,
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
        ],
      },
    ],
  });
}

export async function goalByIdAndRecipient(id, recipientId) {
  return Goal.findOne(OPTIONS_FOR_GOAL_FORM_QUERY(id, recipientId));
}

export async function goalsByIdAndRecipient(ids, recipientId) {
  const goals = await Goal.findAll(OPTIONS_FOR_GOAL_FORM_QUERY(ids, recipientId));
  // dedupe the goals & objectives with shared names + titles
  return reduceGoals(goals);
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
}

// eslint-disable-next-line no-empty-function
export async function copyGoalsToGrants() {}

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
  // there can only be one on the goal form (multiple grants maybe, but one recipient)
  let recipient;
  // eslint-disable-next-line max-len
  const goalIds = await Promise.all(goals.map(async (goalData) => {
    const {
      id,
      grantId,
      recipientId,
      regionId,
      objectives,
      status,
      ...fields
    } = goalData;

    // there can only be one on the goal form (multiple grants maybe, but one recipient)
    recipient = recipientId;

    const options = {
      ...fields,
      isFromSmartsheetTtaPlan: false,
    };

    // In order to reuse goals with matching text we need to do the findOrCreate as the
    // upsert would not preform the extra checks and logic now required.
    const [newGoal] = await Goal.findOrCreate({
      where: {
        grantId,
        name: options.name,
        status: { [Op.not]: 'Closed' },
      },
      defaults: { status },
    });

    await newGoal.update(
      { ...options, status },
      { individualHooks: true },
    );

    // before we create objectives, we have to unpack them to make the creation a little cleaner
    // if an objective was new, then it will not have an id but "isNew" will be true
    // since the goals are packed up, the objectives are too and this may create a situation where
    // an objective belonging to one goal will be looped over as part of creating another goal
    // so we first unpack and then, if the objective already exists, it is safe to update all the
    // data except the goal ID, which we update only if "isNew" is true
    // we will have to be careful and watch for edge cases where isNew is a misrepresentation value

    const objectivesToCreateOrUpdate = objectives.reduce((arr, o) => {
      if (o.isNew) {
        // eslint-disable-next-line no-param-reassign
        return [...arr, o];
      }

      if (o.ids && o.ids.length) {
        return [...arr, ...o.ids.map((objectiveId) => ({ ...o, id: objectiveId }))];
      }

      return [...arr, o];
    }, []);

    const newObjectives = await Promise.all(
      objectivesToCreateOrUpdate.map(async (o) => {
        const {
          resources,
          topics,
          roles: roleNames,
          title,
          status: objectiveStatus,
          id: objectiveId,
          isNew,
        } = o;

        let objective;

        if (isNew) {
          [objective] = await Objective.findOrCreate({
            where: {
              goalId: newGoal.id,
              title,
            },
          });
        } else if (objectiveId) {
          objective = await Objective.findOne({
            where: {
              id: objectiveId,
              goalId: newGoal.id,
            },
          });

          if (!objective) {
            objective = await Objective.create({
              status: objectiveStatus,
              title,
              goalId: newGoal.id,
            });
          }
        }

        await objective.update({
          title,
          status: objectiveStatus,
        }, { individualHooks: true });

        // topics
        const objectiveTopics = await Promise.all(
          (topics.map(async (ot) => ObjectiveTopic.findOrCreate({
            where: {
              objectiveId: objective.id,
              topicId: ot.value,
            },
          }))),
        );

        // cleanup objective topics
        await ObjectiveTopic.destroy({
          where: {
            id: {
              [Op.notIn]: objectiveTopics.length ? objectiveTopics.map(([ot]) => ot.id) : [],
            },
            objectiveId: objective.id,
          },
        });

        // resources
        const objectiveResources = await Promise.all(
          resources.filter(({ value }) => value).map(
            ({ value }) => ObjectiveResource.findOrCreate({
              where: {
                userProvidedUrl: value,
                objectiveId: objective.id,
              },
            }),
          ),
        );

        // cleanup objective resources
        await ObjectiveResource.destroy({
          where: {
            id: {
              [Op.notIn]: objectiveResources.length
                ? objectiveResources.map(([or]) => or.id) : [],
            },
            objectiveId: objective.id,
          },
        });

        // objective roles
        const roles = await Role.findAll({
          where: {
            fullName: roleNames,
          },
        });

        const objectiveRoles = await Promise.all((roles.map(async (role) => {
          const [r] = await ObjectiveRole.findOrCreate({
            where: {
              roleId: role.id,
              objectiveId: objective.id,
            },
          });
          return r;
        })));

        // cleanup objective roles
        await ObjectiveRole.destroy({
          where: {
            id: {
              [Op.notIn]: objectiveRoles.length
                ? objectiveRoles.map((or) => or.id) : [],
            },
            objectiveId: objective.id,
          },
        });

        return {
          ...objective.dataValues,
          topics,
          resources,
          roles,
        };
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
      'name',
      'status',
      'onApprovedAR',
    ],
    group: ['"Goal"."name"', '"Goal"."status"', '"Goal"."onApprovedAR"'],
    where: {
      '$grant.id$': ids,
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
        {
          status: 'Draft',
        },
      ],
    },
    include: [
      {
        model: Grant.unscoped(),
        as: 'grant',
        attributes: [],
      },
    ],
    order: ['name'],
  });
}

async function removeActivityReportObjectivesFromReport(reportId, objectiveIdsToRemove) {
  return ActivityReportObjective.destroy({
    where: {
      activityReportId: reportId,
      objectiveId: objectiveIdsToRemove,
    },
  });
}

async function removeActivityReportGoalsFromReport(reportId, goalIdsToRemove) {
  return ActivityReportGoal.destroy({
    where: {
      activityReportId: reportId,
      goalId: {
        [Op.notIn]: goalIdsToRemove,
      },
    },
  });
}

export async function removeGoals(goalsToRemove) {
  const goalsWithGrants = await Goal.findAll({
    attributes: ['id'],
    where: {
      id: goalsToRemove,
    },
    include: {
      attributes: ['id'],
      model: Grant,
      as: 'grant',
      required: true,
    },
  });

  const goalIdsToKeep = goalsWithGrants.map((g) => g.id);
  const goalsWithoutGrants = goalsToRemove.filter((id) => !goalIdsToKeep.includes(id));

  return Goal.destroy({
    where: {
      id: goalsWithoutGrants,
    },
  });
}

async function removeObjectives(currentObjectiveIds) {
  return Objective.destroy({
    where: {
      id: currentObjectiveIds,
    },
  });
}

export async function removeRemovedRecipientsGoals(removedRecipientIds, report) {
  if (!removedRecipientIds) {
    return null;
  }

  const reportId = parseInt(sequelize.escape(report.id), DECIMAL_BASE);

  const goals = await Goal.findAll({
    attributes: [
      'id',
      [
        sequelize.literal(`((select count(*) from "ActivityReportGoals" where "ActivityReportGoals"."goalId" = "Goal"."id" and "ActivityReportGoals"."activityReportId" not in (${reportId}))::int > 0)`),
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

  await ActivityReportGoal.destroy({
    where: {
      goalId: goalIds,
      activityReportId: reportId,
    },
  });

  const objectives = await Objective.findAll({
    attributes: [
      'id',
      [sequelize.literal(`((select count(*) from "ActivityReportObjectives" where "ActivityReportObjectives"."objectiveId" = "Objective"."id" and "ActivityReportObjectives"."activityReportId" not in (${reportId}))::int > 0)`), 'onOtherAr'],
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

  await ActivityReportObjective.destroy({
    where: {
      objectiveId: objectiveIds,
      activityReportId: reportId,
    },
  });

  await Objective.destroy({
    where: {
      id: objectivesToDelete,
      onApprovedAR: false,
    },
  });

  return Goal.destroy({
    where: {
      id: goalsToDelete,
      onApprovedAR: false,
    },
  });
}

export async function removeUnusedGoalsObjectivesFromReport(reportId, currentObjectives) {
  const previousActivityReportObjectives = await ActivityReportObjective.findAll({
    where: {
      activityReportId: reportId,
    },
    include: {
      model: Objective,
      as: 'objective',
      include: {
        model: Goal,
        as: 'goal',
        include: {
          model: Objective,
          as: 'objectives',
        },
      },
    },
  });

  const currentObjectiveIds = currentObjectives.map((o) => o.id);

  const activityReportObjectivesToRemove = previousActivityReportObjectives.filter(
    (aro) => !currentObjectiveIds.includes(aro.objectiveId),
  );

  const objectiveIdsToRemove = activityReportObjectivesToRemove.map((aro) => aro.objectiveId);
  const goals = activityReportObjectivesToRemove.map((aro) => aro.objective.goal);

  const goalIdsToRemove = goals.filter((g) => g).filter((goal) => {
    const objectiveIds = goal.objectives.map((o) => o.id);
    return objectiveIds.every((oId) => objectiveIdsToRemove.includes(oId));
  }).map((g) => g.id);

  await removeActivityReportObjectivesFromReport(reportId, objectiveIdsToRemove);
  await removeObjectives(objectiveIdsToRemove);
  return removeGoals(goalIdsToRemove);
}

async function createObjectivesForGoal(goal, objectives, report) {
  // we don't want to create objectives with blank titles
  return Promise.all(objectives.filter((o) => o.title).map(async (objective) => {
    const {
      id,
      isNew,
      ttaProvided,
      ActivityReportObjective: aro,
      title,
      status,
      ...updatedFields
    } = objective;

    const updatedObjective = {
      ...updatedFields, title, status, goalId: goal.id,
    };

    let savedObjective;

    if (!isNew && id) {
      savedObjective = await Objective.findByPk(id);

      await savedObjective.update({
        title,
        status,
      }, { individualHooks: true });
    } else {
      const objectiveTitle = updatedObjective.title ? updatedObjective.title.trim() : '';

      const existingObjective = await Objective.findOne({
        where: {
          goalId: updatedObjective.goalId,
          title: objectiveTitle,
          status: { [Op.not]: 'Completed' },
        },
      });

      if (existingObjective) {
        await existingObjective.update({ status }, { individualHooks: true });
        savedObjective = existingObjective;
      } else {
        savedObjective = await Objective.create({
          ...updatedObjective,
          title: objectiveTitle,
          status,
        });
      }
    }

    const [arObjective] = await ActivityReportObjective.findOrCreate({
      where: {
        objectiveId: savedObjective.id,
        activityReportId: report.id,
      },
    });

    await arObjective.update({ ttaProvided }, { individualHooks: true });
    if (objective.topics) {
      await Promise.all((objective.topics.map((ot) => ObjectiveTopic.findOrCreate({
        where: {
          objectiveId: savedObjective.id,
          topicId: ot.value,
        },
      }))));
    }

    if (objective.resources) {
      await Promise.all(
        objective.resources.filter(({ value }) => value).map(
          ({ value }) => ObjectiveResource.findOrCreate({
            where: {
              userProvidedUrl: value,
              objectiveId: savedObjective.id,
            },
          }),
        ),
      );
    }

    if (objective.roles) {
      const roles = await Role.findAll({
        where: {
          fullName: objective.roles,
        },
      });

      await Promise.all(roles.map((r) => ObjectiveRole.findOrCreate({
        where: {
          roleId: r.id,
          objectiveId: savedObjective.id,
        },
      })));
    }

    return savedObjective;
  }));
}

export async function saveGoalsForReport(goals, report) {
  let currentObjectives = [];
  const currentGoals = await Promise.all((goals.map(async (goal) => {
    let newGoals = [];
    const status = goal.status ? goal.status : 'Not Started';

    // we have a param to determine if goals are new
    if (goal.isNew) {
      const {
        isNew, objectives, id, grantIds, status: discardedStatus, onApprovedAR, ...fields
      } = goal;

      newGoals = await Promise.all(goal.grantIds.map(async (grantId) => {
        const [newGoal] = await Goal.findOrCreate({
          where: {
            name: fields.name,
            grantId,
            status: { [Op.not]: 'Closed' },
          },
          defaults: { ...fields, status },
        });

        await ActivityReportGoal.findOrCreate({
          where: {
            goalId: newGoal.id,
            activityReportId: report.id,
          },
        });

        const newGoalObjectives = await createObjectivesForGoal(newGoal, objectives, report);
        currentObjectives = [...currentObjectives, ...newGoalObjectives];

        return newGoal;
      }));
    } else {
      const {
        objectives,
        grantIds,
        status: discardedStatus,
        grant,
        grantId,
        goalIds,
        id, // this is unique and we can't trying to set this
        onApprovedAR, // we don't want to set this manually
        ...fields
      } = goal;

      const existingGoals = await Goal.findAll({
        where: {
          id: goalIds,
        },
      });

      const { goalTemplateId } = existingGoals[0];

      await Promise.all(existingGoals.map(async (existingGoal) => {
        await existingGoal.update({ status, ...fields }, { individualHooks: true });
        // eslint-disable-next-line max-len
        const existingGoalObjectives = await createObjectivesForGoal(existingGoal, objectives, report);
        currentObjectives = [...currentObjectives, ...existingGoalObjectives];
        await ActivityReportGoal.findOrCreate({
          where: {
            goalId: existingGoal.id,
            activityReportId: report.id,
          },
        });
      }));

      newGoals = await Promise.all(grantIds.map(async (gId) => {
        const existingGoal = existingGoals.find((g) => g.grantId === gId);
        if (existingGoal) {
          return existingGoal;
        }

        const [newGoal] = await Goal.findOrCreate({
          where: {
            goalTemplateId,
            grantId: gId,
            status: {
              [Op.not]: 'Closed',
            },
          },
          defaults: { ...fields, status },
        });

        await newGoal.update({ ...fields, status }, { individualHooks: true });

        await ActivityReportGoal.findOrCreate({
          where: {
            goalId: newGoal.id,
            activityReportId: report.id,
          },
        });

        const newGoalObjectives = await createObjectivesForGoal(newGoal, objectives, report);
        currentObjectives = [...currentObjectives, ...newGoalObjectives];

        return newGoal;
      }));
    }

    return newGoals;
  })));

  const currentGoalIds = currentGoals.flat().map((g) => g.id);
  await removeActivityReportGoalsFromReport(report.id, currentGoalIds);
  return removeUnusedGoalsObjectivesFromReport(report.id, currentObjectives);
}

export async function updateGoalStatusById(
  goalIds,
  oldStatus,
  newStatus,
  closeSuspendReason,
  closeSuspendContext,
) {
  const g = await Goal.update({
    status: newStatus,
    closeSuspendReason,
    closeSuspendContext,
    previousStatus: oldStatus,
  }, {
    where: {
      id: goalIds,
    },
    returning: true,
    individualHooks: true,
  });

  const [, updated] = g;

  return updated;
}

export async function getGoalsForReport(reportId) {
  const goals = await Goal.findAll({
    include: [
      {
        model: Grant,
        as: 'grant',
        required: true,
      },
      {
        model: ActivityReport,
        as: 'activityReports',
        where: {
          id: reportId,
        },
        required: true,
        // get goals for a particular AR
      },
      {
        model: Objective,
        as: 'objectives',
        include: [
          {
            model: ActivityReportObjective,
            as: 'activityReportObjectives',
            where: {
              activityReportId: reportId,
            },
            required: true,
            // we need this in case an objective was used on one report but not on another
          },
          {
            model: Role,
            as: 'roles',
          },
          {
            model: Topic,
            as: 'topics',
            // these need to be renamed to match the frontend form names
            attributes: [['name', 'label'], ['id', 'value']],
          },
          {
            model: ObjectiveResource,
            as: 'resources',
            attributes: [['userProvidedUrl', 'value']],
          },
          {
            model: File,
            as: 'files',
          },
        ],
      },
    ],
  });

  // dedupe the goals & objectives
  return reduceGoals(goals);
}

export async function createOrUpdateGoalsForActivityReport(goals, reportId) {
  const activityReportId = parseInt(reportId, DECIMAL_BASE);
  const report = await ActivityReport.findByPk(activityReportId);
  await saveGoalsForReport(goals, report);
  return getGoalsForReport(activityReportId);
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
