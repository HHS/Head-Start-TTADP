import { Op } from 'sequelize';
import { uniqBy } from 'lodash';
import {
  Goal,
  Grant,
  Objective,
  ObjectiveResource,
  ObjectiveFile,
  ObjectiveRole,
  ObjectiveTopic,
  ActivityReportObjective,
  ActivityReportObjectiveTopic,
  ActivityReportObjectiveFile,
  ActivityReportObjectiveResource,
  ActivityReportObjectiveRole,
  sequelize,
  Recipient,
  ActivityReport,
  ActivityReportGoal,
  Topic,
  Program,
  File,
  Role,
} from '../models';
import { DECIMAL_BASE, REPORT_STATUSES, OBJECTIVE_STATUS } from '../constants';
import {
  cacheObjectiveMetadata,
  cacheGoalMetadata,
  destroyActivityReportObjectiveMetadata,
} from './reportCache';

const OPTIONS_FOR_GOAL_FORM_QUERY = (id, recipientId) => ({
  attributes: [
    'id',
    'endDate',
    'name',
    'status',
    [sequelize.col('grant.regionId'), 'regionId'],
    [sequelize.col('grant.recipient.id'), 'recipientId'],
    'goalNumber',
    'createdVia',
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
              sequelize.literal(`(
                SELECT COUNT(aror."id") FROM "ActivityReportObjectiveResources" "aror" 
                INNER JOIN "ActivityReportObjectives" "aro" ON "aro"."id" = "aror"."activityReportObjectiveId"
                WHERE "aror"."userProvidedUrl" = "objectives->resources"."userProvidedUrl"
                AND "aro"."objectiveId" = "objectives"."id"
              ) > 0`),
              'onAnyReport',
            ],
            [
              sequelize.literal(`
                (
                  SELECT COUNT("ar"."id") FROM "ActivityReports" "ar"
                  INNER JOIN "ActivityReportObjectives" "aro" ON "aro"."activityReportId" = "ar"."id"
                  INNER JOIN "ActivityReportObjectiveResources" "o" ON "o"."activityReportObjectiveId" = "aro"."id"
                  WHERE "o"."userProvidedUrl" = "objectives->resources"."userProvidedUrl"
                  AND "aro"."objectiveId" = "objectives"."id"
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
                  INNER JOIN "ActivityReportObjectiveTopics" "ot" ON "ot"."activityReportObjectiveId" = "aro"."id"                                        
                  WHERE "aro"."objectiveId" = "objectives"."id" 
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
                  INNER JOIN "ActivityReportObjectiveTopics" "ot" ON "ot"."activityReportObjectiveId" = "aro"."id" 
                  WHERE "aro"."objectiveId" = "objectives"."id"  AND "ot"."topicId" = "objectives->topics"."id"   
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
          attributes: {
            include: [
              [
                sequelize.literal(`
                  (
                    SELECT COUNT("ar"."id") FROM "ActivityReports" "ar"
                    INNER JOIN "ActivityReportObjectives" "aro" ON "aro"."activityReportId" = "ar"."id"
                    INNER JOIN "ActivityReportObjectiveFiles" "of" ON "of"."activityReportObjectiveId" = "aro"."id"                                        
                    WHERE "aro"."objectiveId" = "objectives"."id" AND "of"."fileId" = "objectives->files"."id"
                  ) > 0
                `),
                'onAnyReport',
              ],
              [
                sequelize.literal(`
                  (
                    SELECT COUNT("ar"."id") FROM "ActivityReports" "ar"
                    INNER JOIN "ActivityReportObjectives" "aro" ON "aro"."activityReportId" = "ar"."id"
                    INNER JOIN "ActivityReportObjectiveFiles" "of" ON "of"."activityReportObjectiveId" = "aro"."id"                                        
                    WHERE "aro"."objectiveId" = "objectives"."id" 
                    AND "of"."fileId" = "objectives->files"."id" 
                    AND "ar"."calculatedStatus" = '${REPORT_STATUSES.APPROVED}'
                  ) > 0
                `),
                'isOnApprovedReport',
              ],
            ],
          },
        },
        {
          model: Role,
          as: 'roles',
          attributes: {
            include: [
              [
                sequelize.literal(`
                (
                  SELECT COUNT("ar"."id") FROM "ActivityReports" "ar"
                  INNER JOIN "ActivityReportObjectives" "aro" ON "aro"."activityReportId" = "ar"."id"
                  INNER JOIN "ActivityReportObjectiveRoles" "or" ON "or"."activityReportObjectiveId" = "aro"."id"                                        
                  WHERE "aro"."objectiveId" = "objectives"."id" 
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
                  INNER JOIN "ActivityReportObjectiveRoles" "or" ON "or"."activityReportObjectiveId" = "aro"."id"                                        
                  WHERE "aro"."objectiveId" = "objectives"."id" 
                  AND "or"."roleId" = "objectives->roles"."id"
                  AND "ar"."calculatedStatus" = '${REPORT_STATUSES.APPROVED}'
                ) > 0
              `),
                'isOnApprovedReport',
              ],
            ],
          },
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

export async function saveObjectiveAssociations(
  objective,
  resources = [],
  topics = [],
  roles = [],
  files = [],
  deleteUnusedAssociations = false,
) {
  // topics
  const objectiveTopics = await Promise.all(
    (topics.map(async (topic) => ObjectiveTopic.findOrCreate({
      where: {
        objectiveId: objective.id,
        topicId: topic.value,
      },
    }))),
  );

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

  const objectiveRoles = await Promise.all((roles.map(async (role) => {
    const [r] = await ObjectiveRole.findOrCreate({
      where: {
        roleId: role.id,
        objectiveId: objective.id,
      },
    });
    return r;
  })));

  const objectiveFiles = await Promise.all(
    files.map(
      (file) => ObjectiveFile.findOrCreate({
        where: {
          fileId: file.id,
          objectiveId: objective.id,
        },
      }),
    ),
  );

  if (deleteUnusedAssociations) {
    // cleanup objective topics
    await ObjectiveTopic.destroy({
      where: {
        id: {
          [Op.notIn]: objectiveTopics.length ? objectiveTopics.map(([ot]) => ot.id) : [],
        },
        objectiveId: objective.id,
      },
    });

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

    // cleanup objective files
    await ObjectiveFile.destroy({
      where: {
        id: {
          [Op.notIn]: objectiveFiles.length
            ? objectiveFiles.map((or) => or.id) : [],
        },
        objectiveId: objective.id,
      },
    });
  }

  return {
    topics: objectiveTopics,
    resources: objectiveResources,
    roles: objectiveRoles,
    files: objectiveFiles,
  };
}

// this is the reducer called when not getting objectives for a report, IE, the RTR table
export function reduceObjectives(newObjectives, currentObjectives = []) {
  return newObjectives.reduce((objectives, objective) => {
    const exists = objectives.find((o) => (
      o.title === objective.title && o.status === objective.status
    ));

    if (exists) {
      const id = objective.getDataValue('id') ? objective.getDataValue('id') : objective.getDataValue('value');
      exists.ids = [...exists.ids, id];
      // Make sure we pass back a list of recipient ids for subsequent saves.
      exists.recipientIds = [...exists.recipientIds, objective.getDataValue('otherEntityId')];
      return objectives;
    }

    const id = objective.getDataValue('id') ? objective.getDataValue('id') : objective.getDataValue('value');

    return [...objectives, {
      ...objective.dataValues,
      value: id,
      ids: [id],
      // Make sure we pass back a list of recipient ids for subsequent saves.
      recipientIds: [objective.getDataValue('otherEntityId')],
      isNew: false,
    }];
  }, currentObjectives);
}

export function reduceObjectivesForActivityReport(newObjectives, currentObjectives = []) {
  return newObjectives.reduce((objectives, objective) => {
    const exists = objectives.find((o) => (
      o.title === objective.title && o.status === objective.status
    ));

    if (exists) {
      const id = objective.getDataValue('id') ? objective.getDataValue('id') : objective.getDataValue('value');
      exists.ids = [...exists.ids, id];

      // we can dedupe these using lodash
      exists.resources = uniqBy([
        ...exists.resources,
        ...objective.activityReportObjectives[0].activityReportObjectiveResources.map(
          (r) => r.dataValues,
        ),
      ], 'value');

      exists.roles = uniqBy([
        ...exists.roles,
        ...objective.activityReportObjectives[0].activityReportObjectiveRoles.map(
          (r) => r.role.dataValues,
        )], 'id');

      exists.topics = uniqBy([
        ...exists.topics,
        ...objective.activityReportObjectives[0].activityReportObjectiveTopics.map(
          (t) => t.topic.dataValues,
        ),
      ], 'id');

      exists.files = uniqBy([
        ...exists.files,
        ...objective.activityReportObjectives[0].activityReportObjectiveFiles.map(
          (f) => ({ ...f.file.dataValues, url: f.file.url }),
        ),
      ], 'key');

      return objectives;
    }

    // since this method is used to rollup both objectives on and off activity reports
    // we need to handle the case where there is TTA provided and TTA not provided
    // NOTE: there will only be one activity report objective, it is queried by activity report id
    const ttaProvided = objective.activityReportObjectives
        && objective.activityReportObjectives[0]
        && objective.activityReportObjectives[0].ttaProvided
      ? objective.activityReportObjectives[0].ttaProvided : null;

    const status = objective.activityReportObjectives
      && objective.activityReportObjectives[0]
      && objective.activityReportObjectives[0].status
      ? objective.activityReportObjectives[0].status : objective.status;

    const id = objective.getDataValue('id') ? objective.getDataValue('id') : objective.getDataValue('value');

    return [...objectives, {
      ...objective.dataValues,
      value: id,
      ids: [id],
      ttaProvided,
      status,
      isNew: false,

      // for the associated models, we need to return not the direct associations
      // but those associated through an activity report since those reflect the state
      // of the activity report not the state of the objective, which is what
      // we are getting at with this method (getGoalsForReport)

      roles: objective.activityReportObjectives[0].activityReportObjectiveRoles.map(
        (r) => r.role.dataValues,
      ),
      topics: objective.activityReportObjectives[0].activityReportObjectiveTopics.map(
        (t) => t.topic.dataValues,
      ),
      resources: objective.activityReportObjectives[0].activityReportObjectiveResources.map(
        (r) => r.dataValues,
      ),
      files: objective.activityReportObjectives[0].activityReportObjectiveFiles.map(
        (f) => ({ ...f.file.dataValues, url: f.file.url }),
      ),
    }];
  }, currentObjectives);
}

/**
 * Dedupes goals by name + status, as well as objectives by title + status
 * @param {Object[]} goals
 * @returns {Object[]} array of deduped goals
 */
function reduceGoals(goals, forReport = false) {
  const objectivesReducer = forReport ? reduceObjectivesForActivityReport : reduceObjectives;
  const r = goals.reduce((previousValue, currentValue) => {
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
          goalId: currentValue.id,
        },
      ];
      existingGoal.grantIds = [...existingGoal.grantIds, currentValue.grant.id];
      existingGoal.objectives = objectivesReducer(
        currentValue.objectives,
        existingGoal.objectives,
      );
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
          goalId: currentValue.id,
        },
      ],
      grantIds: [currentValue.grant.id],
      objectives: objectivesReducer(
        currentValue.objectives,
      ),
      isNew: false,
    };

    return [...previousValue, goal];
  }, []);

  return r;
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
                [Op.notIn]: [OBJECTIVE_STATUS.COMPLETE, OBJECTIVE_STATUS.DRAFT],
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
        ],
        required: false,
        include: [
          {
            model: ObjectiveResource,
            separate: true,
            as: 'resources',
            attributes: [
              ['userProvidedUrl', 'value'],
              ['id', 'key'],
            ],
            required: false,
          },
          {
            model: File,
            as: 'files',
          },
          {
            model: ActivityReportObjective,
            separate: true,
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
            model: File,
            as: 'files',
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
    attributes: ['name', 'id', 'status', 'createdVia'],
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
      createdVia,
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
      { ...options, status, createdVia: createdVia || 'rtr' },
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
          roles,
          title,
          files,
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

        // save all our objective join tables (ObjectiveResource, ObjectiveTopic, ObjectiveRole)
        const deleteUnusedAssociations = true;
        await saveObjectiveAssociations(
          objective,
          resources,
          topics,
          roles,
          files,
          deleteUnusedAssociations,
        );

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
    .filter((g) => g);

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
          sequelize.col('grant.oldGrantId'),
        ),
      ), 'oldGrantIds'],
      'name',
      'status',
      'onApprovedAR',
      'endDate',
    ],
    group: ['"Goal"."name"', '"Goal"."status"', '"Goal"."endDate"', '"Goal"."onApprovedAR"'],
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
  const activityReportObjectivesToDestroy = await ActivityReportObjective.findAll({
    where: {
      activityReportId: reportId,
      objectiveId: objectiveIdsToRemove,
    },
  });

  const idsToDestroy = activityReportObjectivesToDestroy.map((arObjective) => arObjective.id);

  await destroyActivityReportObjectiveMetadata(idsToDestroy);

  return ActivityReportObjective.destroy({
    where: {
      id: idsToDestroy,
    },
  });
}

async function removeActivityReportGoalsFromReport(reportId, currentGoalIds) {
  return ActivityReportGoal.destroy({
    where: {
      activityReportId: reportId,
      goalId: {
        [Op.notIn]: currentGoalIds,
      },
    },
  });
}

/// TTAHUB-949: Uncomment to remove Goals not associated
///  with any ActivityReportGoals or createVia 'ActivityReport'.
/*
export async function removeGoals(goalsToRemove) {
  // Get goals being used by ActivityReportGoals.
  const usedGoals = await ActivityReportGoal.findAll({
    attributes: [
      'goalId',
    ],
    where: {
      goalId: goalsToRemove,
    },
  });

  // Get distinct list of goal ids.
  const usedGoalIds = [...new Set(usedGoals.map((g) => g.goalId))];

  // Create array of goals to delete.
  const goalsToDelete = goalsToRemove.filter((o) => !usedGoalIds.includes(o));

  // Delete goals not being used that where createdVia 'ActivityReports'.
  return Goal.destroy({
    where: {
      [Op.and]: [
        {
          id: goalsToDelete,
        },
        {
          createdVia: 'activityReport',
        },
      ],
    },
  });
}
*/
/// TTAHUB-949: Uncomment to remove Objectives not associated
///  with any ActivityReportObjectives or createVia 'ActivityReport'.
/*
async function removeObjectives(currentObjectiveIds) {
  // Get objectives being used by ActivityReportObjectives.
  const usedObjectives = await ActivityReportObjective.findAll({
    attributes: [
      'objectiveId',
    ],
    where: {
      objectiveId: currentObjectiveIds,
    },
  });

  // Get distinct list of objective ids.
  const usedObjectiveIds = [...new Set(usedObjectives.map((o) => o.objectiveId))];

  // Create array of objectives to delete.
  const objectivesToDelete = currentObjectiveIds.filter((o) => !usedObjectiveIds.includes(o));

  // Delete objectives not being used.
  const objectiveIdsWhere = objectivesToDelete && objectivesToDelete.length ?
    `g.id IN (${objectivesToDelete.join(',')}) AND ` : '';
  return Objective.destroy({
    where: [
      {
        id: objectivesToDelete,
      },
      sequelize.where(
        sequelize.literal(`
      (SELECT COUNT(DISTINCT g."id")
      FROM "Objectives"
      INNER JOIN "Goals" g ON "Objectives"."goalId" = "g"."id"
      WHERE ${objectiveIdsWhere}
       g."createdVia" = 'rtr')`),
        {
          [Op.eq]: 0,
        },
      ),
    ],
  });
}
*/

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
  });

  const currentObjectiveIds = currentObjectives.map((o) => o.id);

  const activityReportObjectivesToRemove = previousActivityReportObjectives.filter(
    (aro) => !currentObjectiveIds.includes(aro.objectiveId),
  );

  const objectiveIdsToRemove = activityReportObjectivesToRemove.map((aro) => aro.objectiveId);

  /// TTAHUB-949: Uncomment to remove unused Goals and Objectives.
  /*
  const goals = activityReportObjectivesToRemove.map((aro) => aro.objective.goal);
  const goalIdsToRemove = goals.filter((g) => g).filter((goal) => {
    const objectiveIds = goal.objectives.map((o) => o.id);
    return objectiveIds.every((oId) => objectiveIdsToRemove.includes(oId));
  }).map((g) => g.id);
  */

  await removeActivityReportObjectivesFromReport(reportId, objectiveIdsToRemove);
  /// TTAHUB-949: Uncomment to remove unused Goals and Objectives.
  /*
  await removeObjectives(objectiveIdsToRemove);
  return removeGoals(goalIdsToRemove);
  */
}

async function createObjectivesForGoal(goal, objectives, report) {
  /*
     Note: Objective Status
     We only want to set Objective status from here on initial Objective creation.
     All subsequent Objective status updates should come from the AR Hook using end date.
  */

  if (!objectives) {
    return [];
  }

  // we don't want to create objectives with blank titles
  return Promise.all(objectives.filter((o) => o.title).map(async (objective) => {
    const {
      id,
      isNew,
      ttaProvided,
      ActivityReportObjective: aro,
      title,
      status,
      resources,
      topics,
      roles,
      files,
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
        });
      } else {
        savedObjective = existingObjective;
      }
    }

    // this will save all our objective join table data
    // however, in the case of the Activity Report, we can't really delete
    // unused join table data, so we'll just create any missing links
    // so that the metadata is saved properly

    const deleteUnusedAssociations = false;
    const metadata = await saveObjectiveAssociations(
      savedObjective,
      resources,
      topics,
      roles,
      files,
      deleteUnusedAssociations,
    );

    // this will link our objective to the activity report through
    // activity report objective and then link all associated objective data
    // to the activity report objective to capture this moment in time
    await cacheObjectiveMetadata(
      savedObjective,
      report.id,
      {
        ...metadata,
        status,
        ttaProvided: objective.ttaProvided,
      },
    );
    return savedObjective;
  }));
}

export async function saveGoalsForReport(goals, report) {
  let currentObjectives = [];
  const currentGoals = await Promise.all((goals.map(async (goal) => {
    let newGoals = [];
    const status = goal.status ? goal.status : 'Draft';
    const goalIds = goal.goalIds ? goal.goalIds : [];
    const endDate = goal.endDate && goal.endDate.toLowerCase() !== 'invalid date' ? goal.endDate : null;

    // Check if these goals exist.
    const existingGoals = await Goal.findAll({
      where: {
        id: goalIds,
      },
    });

    // we have a param to determine if goals are new
    if (goal.isNew || !existingGoals.length) {
      const {
        isNew,
        objectives,
        id,
        grantIds,
        status: discardedStatus,
        onApprovedAR,
        createdVia,
        endDate: discardedEndDate,
        ...fields
      } = goal;

      // Reuse an existing Goal:
      // - Has the same name.
      // - Grant Id.
      // - And status is not closed.
      // Note: The existing goal should be used regardless if it was created new.
      newGoals = await Promise.all(goal.grantIds.map(async (grantId) => {
        const [newGoal] = await Goal.findOrCreate({
          where: {
            name: fields.name,
            grantId,
            status: { [Op.not]: 'Closed' },
          },
          defaults: {
            ...fields,
            status,
            grantId, // If we don't specify the grant it will be created with the old.
            createdVia: 'activityReport',
          },
        });

        if (!newGoal.onApprovedAR && endDate && endDate !== 'Invalid date') {
          await newGoal.update({ endDate }, { individualHooks: true });
        }

        await cacheGoalMetadata(newGoal, report.id);

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
        id, // this is unique and we can't trying to set this
        onApprovedAR, // we don't want to set this manually
        endDate: discardedEndDate, // get this outta here
        createdVia,
        ...fields
      } = goal;

      const { goalTemplateId } = existingGoals[0];

      await Promise.all(existingGoals.map(async (existingGoal) => {
        await existingGoal.update({ status, endDate, ...fields }, { individualHooks: true });
        // eslint-disable-next-line max-len
        const existingGoalObjectives = await createObjectivesForGoal(existingGoal, objectives, report);
        currentObjectives = [...currentObjectives, ...existingGoalObjectives];

        await cacheGoalMetadata(existingGoal, report.id);
      }));

      newGoals = await Promise.all(grantIds.map(async (gId) => {
        const existingGoal = existingGoals.find((g) => g.grantId === gId);
        if (existingGoal) {
          return existingGoal;
        }

        const [newGoal] = await Goal.findOrCreate({
          where: {
            [Op.and]: [
              { goalTemplateId: { [Op.not]: null } }, // We need to exclude null matches.
              { goalTemplateId: { [Op.eq]: goalTemplateId } },
            ],
            grantId: gId,
            status: {
              [Op.not]: 'Closed',
            },
          },
          defaults: { ...fields, status },
        });

        await newGoal.update({
          ...fields, status, endDate, createdVia: createdVia || 'activityReport',
        }, { individualHooks: true });

        await cacheGoalMetadata(newGoal, report.id);

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
    where: {
      id: {
        [Op.in]: sequelize.literal(`(SELECT "goalId" FROM "ActivityReportGoals" WHERE "activityReportId" = ${reportId})`),
      },
    },
    include: [
      {
        model: Grant,
        as: 'grant',
        required: true,
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
            include: [
              {

                model: ActivityReportObjectiveTopic,
                as: 'activityReportObjectiveTopics',
                required: false,
                include: [
                  {
                    model: Topic,
                    as: 'topic',
                    attributes: [
                      ['name', 'label'],
                      ['id', 'value'],
                    ],
                  },
                ],
              },
              {
                model: ActivityReportObjectiveFile,
                as: 'activityReportObjectiveFiles',
                required: false,
                include: [
                  {
                    model: File,
                    as: 'file',
                  },
                ],
              },
              {
                model: ActivityReportObjectiveResource,
                as: 'activityReportObjectiveResources',
                required: false,
                attributes: [['userProvidedUrl', 'value'], ['id', 'key']],
              },
              {
                model: ActivityReportObjectiveRole,
                as: 'activityReportObjectiveRoles',
                required: false,
                include: [
                  {
                    model: Role,
                    as: 'role',
                  },
                ],
              },
            ],
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
  const forReport = true;
  return reduceGoals(goals, forReport);
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
