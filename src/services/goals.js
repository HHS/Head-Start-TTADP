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
    'isRttapa',
    [
      'onAR',
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
          'onAR',
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
              'onAR',
              'onAnyReport',
            ],
            [
              'onApprovedAR',
              'isOnApprovedReport',
            ],
          ],
        },
        {
          model: ObjectiveTopic,
          as: 'objectiveTopics',
          attributes: [
            [
              'onAR',
              'onAnyReport',
            ],
            [
              'onApprovedAR',
              'isOnApprovedReport',
            ],
          ],
          include: [
            {
              model: Topic,
              as: 'topic',
              attributes: ['id', 'name'],
            },
          ],
        },
        {
          model: ObjectiveFile,
          as: 'objectiveFiles',
          attributes: [
            [
              'onAR',
              'onAnyReport',
            ],
            [
              'onApprovedAR',
              'isOnApprovedReport',
            ],
          ],
          include: [
            {
              model: File,
              as: 'file',
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
  // We need to know if the objectiveTemplateId is populated to know if we
  // can disable the hooks on the ObjectiveTopic
  const o = await Objective.findOne({
    attributes: ['objectiveTemplateId'],
    where: { id: objective.id },
    raw: true,
  });

  // topics
  const objectiveTopics = await Promise.all(
    (topics.map(async (topic) => {
      let otopic = await ObjectiveTopic.findOne({
        where: {
          objectiveId: objective.id,
          topicId: topic.id,
        },
      });
      if (!otopic) {
        otopic = await ObjectiveTopic.create({
          objectiveId: objective.id,
          topicId: topic.id,
        }, { hooks: !!o.objectiveTemplateId });
      }
      return otopic;
    })),
  );

  if (deleteUnusedAssociations) {
    // cleanup objective topics
    await ObjectiveTopic.destroy({
      where: {
        id: {
          [Op.notIn]: objectiveTopics.length ? objectiveTopics.map((ot) => ot.id) : [],
        },
        objectiveId: objective.id,
      },
    });
  }

  // resources
  const objectiveResources = await Promise.all(
    resources.filter(({ value }) => value).map(
      async ({ value }) => {
        let oresource = await ObjectiveResource.findOne({
          where: {
            userProvidedUrl: value,
            objectiveId: objective.id,
          },
        });
        if (!oresource) {
          oresource = await ObjectiveResource.create({
            userProvidedUrl: value,
            objectiveId: objective.id,
          }, { hooks: !!o.objectiveTemplateId });
        }
        return oresource;
      },
    ),
  );

  if (deleteUnusedAssociations) {
    // cleanup objective resources
    await ObjectiveResource.destroy({
      where: {
        id: {
          [Op.notIn]: objectiveResources.length
            ? objectiveResources.map((or) => or.id) : [],
        },
        objectiveId: objective.id,
      },
    });
  }

  const objectiveFiles = await Promise.all(
    files.map(
      async (file) => {
        let ofile = await ObjectiveFile.findOne({
          where: {
            fileId: file.id,
            objectiveId: objective.id,
          },
        });
        if (!ofile) {
          ofile = await ObjectiveFile.create({
            fileId: file.id,
            objectiveId: objective.id,
          }, { hooks: !!o.objectiveTemplateId });
        }
        return ofile;
      },
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

  const where = (g, currentValue) => (forReport ? g.name === currentValue.name
    && g.status === currentValue.status
    && g.isRttapa === currentValue.activityReportGoals[0].isRttapa : g.name === currentValue.name
    && g.status === currentValue.status);

  const r = goals.reduce((previousValues, currentValue) => {
    const existingGoal = previousValues.find((g) => where(g, currentValue));

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

    if (forReport) {
      goal.isRttapa = currentValue.activityReportGoals[0].isRttapa;
      goal.initialRttapa = currentValue.isRttapa;
    }

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
  const goal = await Goal.findOne(OPTIONS_FOR_GOAL_FORM_QUERY(id, recipientId));
  goal.objectives = goal.objectives
    .map((objective) => ({
      ...objective.dataValues,
      topics: objective.objectiveTopics
        .map((objectiveTopic) => ({
          ...objectiveTopic.dataValues,
          ...objectiveTopic.topic.dataValues,
        }))
        .map((o) => ({ ...o, topic: undefined })),
      files: objective.objectiveFiles
        .map((objectiveFile) => ({
          ...objectiveFile.dataValues,
          ...objectiveFile.file.dataValues,
        }))
        .map((f) => ({ ...f, file: undefined })),
      resources: objective.resources.map((resource) => ({ ...resource.dataValues })),
    }))
    .map((objective) => ({ ...objective, objectiveTopics: undefined, objectiveFiles: undefined }));
  return goal;
}

export async function goalsByIdAndRecipient(ids, recipientId) {
  let goals = await Goal.findAll(OPTIONS_FOR_GOAL_FORM_QUERY(ids, recipientId));
  goals = goals.map((goal) => ({
    ...goal,
    objectives: goal.objectives
      .map((objective) => ({
        ...objective,
        topics: objective.objectiveTopics
          .map((objectiveTopic) => ({
            ...objectiveTopic.dataValues,
            ...objectiveTopic.topic.dataValues,
          }))
          .map((o) => ({ ...o, topic: undefined })),
        files: objective.objectiveFiles
          .map((objectiveFile) => ({
            ...objectiveFile.dataValues,
            ...objectiveFile.file.dataValues,
          }))
          .map((f) => ({ ...f, file: undefined })),
        resources: objective.resources.map((resource) => ({ ...resource.dataValues })),
      }))
      .map((objective) => ({
        ...objective,
        objectiveTopics: undefined,
        objectiveFiles: undefined,
      })),
  }));
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

  if (Array.isArray(orphanedObjectiveIds) && orphanedObjectiveIds.length > 0) {
    await Promise.all([
      ObjectiveFile.destroy({
        where: {
          objectiveId: orphanedObjectiveIds,
        },
      }),
      ObjectiveResource.destroy({
        where: {
          objectiveId: orphanedObjectiveIds,
        },
      }),
      ObjectiveTopic.destroy({
        where: {
          objectiveId: orphanedObjectiveIds,
        },
      }),
    ]);
  }

  return (Array.isArray(orphanedObjectiveIds) && orphanedObjectiveIds.length > 0)
    ? Objective.destroy({
      where: {
        id: orphanedObjectiveIds,
      },
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
  const goalIds = await Promise.all(goals.map(async (goalData) => {
    const {
      ids,
      grantId,
      recipientId,
      regionId,
      objectives,
      createdVia,
      isRttapa,
      endDate,
      status,
      ...options
    } = goalData;

    // there can only be one on the goal form (multiple grants maybe, but one recipient)
    recipient = recipientId;

    let isRttapaValue = null;

    if (isRttapa === 'Yes' || isRttapa === 'No') {
      isRttapaValue = isRttapa;
    }
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
      newGoal = await Goal.findOne({
        where: {
          grantId,
          status: {
            [Op.not]: 'Closed',
          },
          name: options.name,
        },
      });
      if (!newGoal) {
        newGoal = await Goal.create({
          grantId,
          name: options.name,
          status: 'Draft', // if we are creating a goal for the first time, it should be set to 'Draft'
          isFromSmartsheetTtaPlan: false,
        });
      }
    }

    // we can't update this stuff if the goal is on an approved AR
    if (newGoal && !newGoal.onApprovedAR) {
      await newGoal.update(
        {
          ...options,
          isRttapa: isRttapaValue,
          status,
          // if the createdVia column is populated, keep what's there
          // otherwise, if the goal is imported, we say so
          // otherwise, we've got ourselves an rtr goal, baby
          createdVia: createdVia || (newGoal.isFromSmartsheetTtaPlan ? 'imported' : 'rtr'),
          endDate: endDate || null,
        },
        { individualHooks: true },
      );
    // except for the end date, which is always editable
    } else if (newGoal) {
      await newGoal.update(
        { endDate: endDate || null, isRttapa: isRttapaValue },
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
            where: {
              id: objectiveIds,
              status: OBJECTIVE_STATUS.COMPLETE,
            },
          });

          if (objective) {
            return {
              ...objective.dataValues,
              topics,
              resources,
              files,
            };
          }
        }

        if (objectiveIds && objectiveIds.length) {
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
          objective = await Objective.findOne({
            where: {
              status: { [Op.not]: OBJECTIVE_STATUS.COMPLETE },
              title,
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
      'isRttapa',
    ],
    group: ['"Goal"."name"', '"Goal"."status"', '"Goal"."endDate"', '"Goal"."onApprovedAR"', '"Goal"."isRttapa"'],
    where: {
      '$grant.id$': ids,
      status: {
        [Op.or]: [
          { [Op.notIn]: ['Closed', 'Suspended'] },
          { [Op.is]: null },
        ],
      },
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
  const activityReportObjectivesToDestroy = Array.isArray(objectiveIdsToRemove)
  && objectiveIdsToRemove > 0
    ? await ActivityReportObjective.findAll({
      attributes: ['id'],
      where: {
        activityReportId: reportId,
        objectiveId: objectiveIdsToRemove,
      },
    })
    : [];

  const idsToDestroy = activityReportObjectivesToDestroy.map((arObjective) => arObjective.id);

  await destroyActivityReportObjectiveMetadata(idsToDestroy, objectiveIdsToRemove);

  return Array.isArray(idsToDestroy) && idsToDestroy.length > 0
    ? ActivityReportObjective.destroy({
      where: {
        id: idsToDestroy,
      },
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
    });
  }

  if (Array.isArray(objectivesToDelete) && objectivesToDelete.length > 0) {
    await Objective.destroy({
      where: {
        id: objectivesToDelete,
        onApprovedAR: false,
      },
    });
  }

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
  return Promise.all(objectives.filter((o) => o.title
    || o.ttaProvided
    || o.topics.length
    || o.resources.length
    || o.files.length).map(async (objective) => {
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
    const existingGoals = Array.isArray(goalIds) && goalIds.length > 0
      ? await Goal.findAll({ // All fields are needed.
        where: {
          id: goalIds,
        },
      })
      : [];

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
        isRttapa,
        ...fields
      } = goal;

      // Reuse an existing Goal:
      // - Has the same name.
      // - Grant Id.
      // - And status is not closed.
      // Note: The existing goal should be used regardless if it was created new.
      newGoals = await Promise.all(goal.grantIds.map(async (grantId) => {
        // const [newGoal] = await Goal.findOrCreate({
        //   where: {
        //     name: fields.name,
        //     grantId,
        //     status: { [Op.not]: 'Closed' },
        //   },
        //   defaults: {
        //     ...fields,
        //     status,
        //     grantId, // If we don't specify the grant it will be created with the old.
        //     createdVia: 'activityReport',
        //   },
        // });
        let newGoal = await Goal.findOne({
          where: {
            name: fields.name,
            grantId,
            status: { [Op.not]: 'Closed' },
          },
        });
        if (!newGoal) {
          newGoal = await Goal.create({
            grantId, // If we don't specify the grant it will be created with the old.
            ...fields,
            status,
            onApprovedAR,
            createdVia: 'activityReport',
          });
        }

        if (!newGoal.onApprovedAR && endDate && endDate !== 'Invalid date') {
          await newGoal.update({ endDate }, { individualHooks: true });
        }

        await cacheGoalMetadata(newGoal, report.id, isRttapa || null);

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
        goalIds: discardedGoalIds,
        isRttapa,
        ...fields
      } = goal;

      const { goalTemplateId } = existingGoals[0];

      await Promise.all(existingGoals.map(async (existingGoal) => {
        await existingGoal.update({
          status, endDate, ...fields,
        }, { individualHooks: true });

        const existingGoalObjectives = await createObjectivesForGoal(
          existingGoal,
          objectives,
          report,
        );
        currentObjectives = [...currentObjectives, ...existingGoalObjectives];

        await cacheGoalMetadata(existingGoal, report.id, isRttapa);
      }));

      newGoals = await Promise.all(grantIds.map(async (gId) => {
        const existingGoal = existingGoals.find((g) => g.grantId === gId);
        if (existingGoal) {
          return existingGoal;
        }

        // const [newGoal] = await Goal.findOrCreate({
        //   where: {
        //     [Op.and]: [
        //       { goalTemplateId: { [Op.not]: null } }, // We need to exclude null matches.
        //       { goalTemplateId: { [Op.eq]: goalTemplateId } },
        //     ],
        //     grantId: gId,
        //     status: {
        //       [Op.not]: 'Closed',
        //     },
        //   },
        //   defaults: { ...fields, status },
        // });
        let newGoal = await Goal.findOne({ // All columns are needed for caching metadata.
          where: {
            [Op.and]: [
              { goalTemplateId: { [Op.not]: null } }, // We need to exclude null matches.
              { goalTemplateId: { [Op.eq]: goalTemplateId } },
            ],
            name: fields.name,
            grantId: gId,
            status: { [Op.not]: 'Closed' },
          },
        });
        if (!newGoal) {
          newGoal = await Goal.create({
            goalTemplateId,
            grantId: gId,
            ...fields,
            status,
          });
        }

        await newGoal.update({
          ...fields, status, endDate, createdVia: createdVia || 'activityReport',
        }, { individualHooks: true });

        await cacheGoalMetadata(newGoal, report.id, isRttapa);

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
        model: ActivityReportGoal,
        as: 'activityReportGoals',
        where: {
          activityReportId: reportId,
        },
        required: true,
      },
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
    order: [
      [[sequelize.col('activityReportGoals.createdAt'), 'asc']],
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

    const objectiveTopicsDestroyed = (Array.isArray(objectiveIds) && objectiveIds.length)
      ? await ObjectiveTopic.destroy({
        where: {
          objectiveId: { [Op.in]: objectiveIds },
        },
      })
      : await Promise.resolve();

    const objectiveResourcesDestroyed = (Array.isArray(objectiveIds) && objectiveIds.length)
      ? await ObjectiveResource.destroy({
        where: {
          objectiveId: { [Op.in]: objectiveIds },
        },
      })
      : await Promise.resolve();

    const objectivesDestroyed = (Array.isArray(objectiveIds) && objectiveIds.length)
      ? await Objective.destroy({
        where: {
          id: { [Op.in]: objectiveIds },
        },
      })
      : await Promise.resolve();

    const goalsDestroyed = (Array.isArray(goalIds) && goalIds.length)
      ? await Goal.destroy({
        where: {
          id: { [Op.in]: goalIds },
        },
      })
      : await Promise.resolve();

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
