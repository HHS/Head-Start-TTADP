import { Op } from 'sequelize';
import { uniqBy } from 'lodash';
import {
  Goal,
  Grant,
  Objective,
  ObjectiveResource,
  ObjectiveFile,
  ObjectiveTopic,
  ActivityReportObjective,
  ActivityReportObjectiveTopic,
  ActivityReportObjectiveFile,
  ActivityReportObjectiveResource,
  sequelize,
  Recipient,
  ActivityReport,
  ActivityReportGoal,
  Topic,
  Program,
  File,
} from '../models';
import { DECIMAL_BASE, REPORT_STATUSES, OBJECTIVE_STATUS } from '../constants';
import {
  cacheObjectiveMetadata,
  cacheGoalMetadata,
  destroyActivityReportObjectiveMetadata,
} from './reportCache';
import { auditLogger } from '../logger';

const namespace = 'SERVICE:GOALS';

const logContext = {
  namespace,
};

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
            'id',
            'name',
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
  files = [],
  deleteUnusedAssociations = false,
) {
  // topics
  const objectiveTopics = await Promise.all(
    (topics.map(async (topic) => ObjectiveTopic.findOrCreate({
      where: {
        objectiveId: objective.id,
        topicId: topic.id,
      },
    }))),
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
  }

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

  if (deleteUnusedAssociations) {
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
  }

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
    files: objectiveFiles,
  };
}

// this is the reducer called when not getting objectives for a report, IE, the RTR table
export function reduceObjectives(newObjectives, currentObjectives = []) {
  // objectives = accumulator
  // we pass in the existing objectives as the accumulator
  return newObjectives.reduce((objectives, objective) => {
    const exists = objectives.find((o) => (
      o.title === objective.title && o.status === objective.status
    ));

    if (exists) {
      const id = objective.getDataValue('id') ? objective.getDataValue('id') : objective.getDataValue('value');
      exists.ids = [...exists.ids, id];
      // Make sure we pass back a list of recipient ids for subsequent saves.
      exists.recipientIds = [...exists.recipientIds, objective.getDataValue('otherEntityId')];
      exists.activityReports = [
        ...(exists.activityReports || []),
        ...(objective.activityReports || []),
      ];
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
    // check the activity report objective status
    const objectiveStatus = objective.activityReportObjectives
      && objective.activityReportObjectives[0]
      && objective.activityReportObjectives[0].status
      ? objective.activityReportObjectives[0].status : objective.status;

    // objectives represent the accumulator in the find below
    // objective is the objective as it is returned from the API
    const exists = objectives.find((o) => (
      o.title === objective.title && o.status === objectiveStatus
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

    const id = objective.getDataValue('id') ? objective.getDataValue('id') : objective.getDataValue('value');

    return [...objectives, {
      ...objective.dataValues,
      value: id,
      ids: [id],
      ttaProvided,
      status: objectiveStatus, // the status from above, derived from the activity report objective
      isNew: false,

      // for the associated models, we need to return not the direct associations
      // but those associated through an activity report since those reflect the state
      // of the activity report not the state of the objective, which is what
      // we are getting at with this method (getGoalsForReport)

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
  const r = goals.reduce((previousValues, currentValue) => {
    const existingGoal = previousValues.find((g) => (
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
      return previousValues;
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

    return [...previousValues, goal];
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
            model: File,
            as: 'files',
          },
          {
            model: Topic,
            as: 'topics',
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
  return reduceGoals(await Goal.findAll(OPTIONS_FOR_GOAL_FORM_QUERY(ids, recipientId)));
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
      ids,
      grantId,
      recipientId,
      regionId,
      objectives,
      createdVia,
      endDate,
      status,
      ...options
    } = goalData;

    // there can only be one on the goal form (multiple grants maybe, but one recipient)
    recipient = recipientId;

    // we first need to see if the goal exists given what ids we have
    // for new goals, the id will be an empty array
    let newGoal = await Goal.findOne({
      where: {
        grantId,
        status: { [Op.not]: 'Closed' },
        id: ids || [],
      },
    });

    // In order to reuse goals with matching text we need to do the findOrCreate as the
    // upsert would not preform the extra checks and logic now required.
    if (!newGoal) {
      [newGoal] = await Goal.findOrCreate({
        where: {
          grantId,
          status: {
            [Op.not]: 'Closed',
          },
          name: options.name,
        },
        defaults: {
          status: 'Draft', // if we are creating a goal for the first time, it should be set to 'Draft'
          isFromSmartsheetTtaPlan: false,
        },
      });
    }

    // we can't update this stuff if the goal is on an approved AR
    if (newGoal && !newGoal.onApprovedAR) {
      await newGoal.update(
        {
          ...options,
          status,
          createdVia: createdVia || 'rtr',
          endDate: endDate || null,
        },
        { individualHooks: true },
      );
    // except for the end date, which is always editable
    } else if (newGoal) {
      await newGoal.update(
        { endDate: endDate || null },
        { individualHooks: true },
      );
    }

    const newObjectives = await Promise.all(
      objectives.map(async (o) => {
        const {
          resources,
          topics,
          title,
          files,
          status: objectiveStatus,
          id: objectiveIds,
          isNew,
        } = o;

        let objective;

        // if the objective is complete on both the front and back end
        // we need to handle things a little differently
        if (objectiveStatus === OBJECTIVE_STATUS.COMPLETE && objectiveIds) {
          objective = await Objective.findOne({
            where: {
              id: objectiveIds,
              status: OBJECTIVE_STATUS.COMPLETE,
            },
          });

          return {
            ...objective.dataValues,
            topics,
            resources,
            files,
          };
        }

        if (isNew && !objective) {
          [objective] = await Objective.findOrCreate({
            where: {
              goalId: newGoal.id,
              title,
              status: {
                [Op.not]: OBJECTIVE_STATUS.COMPLETE,
              },
            },
            defaults: {
              status: objectiveStatus,
              title,
              goalId: newGoal.id,
            },
          });
        } else if (objectiveIds) {
          // this needs to find "complete" objectives as well
          // since we could be moving the status back from the RTR
          objective = await Objective.findOne({
            where: {
              id: objectiveIds,
              goalId: newGoal.id,
            },
          });
        }

        if (!objective) {
          [objective] = await Objective.findOrCreate({
            where: {
              status: {
                [Op.not]: OBJECTIVE_STATUS.COMPLETE,
              },
              title,
              goalId: newGoal.id,
            },
            defaults: {
              status: objectiveStatus,
              title,
              goalId: newGoal.id,
            },
          });
        }

        await objective.update({
          title,
          status: objectiveStatus,
        }, { individualHooks: true });

        // save all our objective join tables (ObjectiveResource, ObjectiveTopic, ObjectiveFile)
        const deleteUnusedAssociations = true;
        await saveObjectiveAssociations(
          objective,
          resources,
          topics,
          files,
          deleteUnusedAssociations,
        );

        return {
          ...objective.dataValues,
          topics,
          resources,
          files,
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
      [sequelize.fn(
        'MAX',
        sequelize.fn(
          'DISTINCT',
          sequelize.col('"Goal"."createdAt"'),
        ),
      ), 'created'],

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
        goalIds: discardedeGoalIds,
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
            ],
          },
          {
            model: Topic,
            as: 'topics',
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

export async function destroyGoal(goalIds) {
  try {
    const reportsWithGoal = await ActivityReport.findAll({
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
    });

    const isOnReport = reportsWithGoal.length;
    if (isOnReport) {
      throw new Error('Goal is on an activity report and can\'t be deleted');
    }

    const objectives = await Objective.findAll({
      where: {
        goalId: goalIds,
      },
    });

    const objectiveIds = objectives.map((o) => o.id);

    const objectiveTopicsDestroyed = await ObjectiveTopic.destroy({
      where: {
        objectiveId: objectiveIds,
      },
    });

    const objectiveResourcesDestroyed = await ObjectiveResource.destroy({
      where: {
        objectiveId: objectiveIds,
      },
    });

    const objectivesDestroyed = await Objective.destroy({
      where: {
        id: objectiveIds,
      },
    });

    const goalsDestroyed = await Goal.destroy({
      where: {
        id: goalIds,
      },
    });

    return {
      goalsDestroyed,
      objectiveResourcesDestroyed,
      objectiveTopicsDestroyed,
      objectivesDestroyed,
    };
  } catch (error) {
    auditLogger.error(
      `${logContext.namespace} - Sequelize error - unable to delete from db - ${error}`,
    );
    return 0;
  }
}
