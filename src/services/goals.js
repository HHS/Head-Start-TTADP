import { Op } from 'sequelize';
import moment from 'moment';
import { uniqBy, uniq } from 'lodash';
import { DECIMAL_BASE, REPORT_STATUSES } from '@ttahub/common';
import { processObjectiveForResourcesById } from './resource';
import {
  Goal,
  GoalFieldResponse,
  GoalTemplate,
  GoalTemplateFieldPrompt,
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
  Resource,
  ActivityReport,
  ActivityReportGoal,
  ActivityReportGoalFieldResponse,
  Topic,
  Program,
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
} from './reportCache';
import { setFieldPromptsForCuratedTemplate } from './goalTemplates';
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
    'goalTemplateId',
    'source',
    [
      'onAR',
      'onAnyReport',
    ],
    'onApprovedAR',
    [sequelize.literal(`"goalTemplate"."creationMethod" = '${CREATION_METHOD.CURATED}'`), 'isCurated'],
    'rtrOrder',
  ],
  order: [['rtrOrder', 'asc']],
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
        'rtrOrder',
        'previousStatus',
        [
          'onAR',
          'onAnyReport',
        ],
      ],
      model: Objective,
      as: 'objectives',
      order: [['rtrOrder', 'ASC']],
      include: [
        {
          model: ObjectiveResource,
          as: 'objectiveResources',
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
              model: Resource,
              as: 'resource',
              attributes: [
                ['url', 'value'],
                ['id', 'key'],
              ],
            },
          ],
          where: { sourceFields: { [Op.contains]: [SOURCE_FIELD.REPORTOBJECTIVE.RESOURCE] } },
          required: false,
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
        'numberWithProgramTypes',
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
    {
      model: GoalTemplate,
      as: 'goalTemplate',
      attributes: [],
      required: false,
    },
    {
      model: GoalTemplateFieldPrompt,
      as: 'prompts',
      attributes: [
        ['id', 'promptId'],
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
          attributes: ['response'],
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
            where: { goalId: id },
          }],
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
        }, {
          ...(!!o.objectiveTemplateId && { ignoreHooks: { name: 'ToTemplate', suffix: true } }),
        });
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
      individualHooks: true,
    });
  }

  // resources
  let objectiveResources = await processObjectiveForResourcesById(
    objective.id,
    resources
      .filter(({ value }) => value)
      .map(({ value }) => value),
    [],
    !deleteUnusedAssociations,
  );

  // filter the returned resources to only those passed to not falsely include prior resources.
  if (!deleteUnusedAssociations) {
    objectiveResources = objectiveResources
      ?.filter((oR) => resources.map((r) => r.value).includes(oR.resource.dataValues.url));
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
          }, {
            ...(!!o.objectiveTemplateId && { ignoreHooks: { name: 'ToTemplate', suffix: true } }),
          });
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
      individualHooks: true,
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
  const objectivesToSort = newObjectives.reduce((objectives, objective) => {
    const exists = objectives.find((o) => (
      o.title.trim() === objective.title.trim() && o.status === objective.status
    ));
    // eslint-disable-next-line no-nested-ternary
    const id = objective.getDataValue
      ? objective.getDataValue('id')
        ? objective.getDataValue('id')
        : objective.getDataValue('value')
      : objective.id;
    const otherEntityId = objective.getDataValue
      ? objective.getDataValue('otherEntityId')
      : objective.otherEntityId;

    if (exists) {
      exists.ids = [...exists.ids, id];
      // Make sure we pass back a list of recipient ids for subsequent saves.
      exists.recipientIds = otherEntityId
        ? [...exists.recipientIds, otherEntityId]
        : [...exists.recipientIds];
      exists.activityReports = [
        ...(exists.activityReports || []),
        ...(objective.activityReports || []),
      ];
      return objectives;
    }

    return [...objectives, {
      ...(objective.dataValues
        ? objective.dataValues
        : objective),
      title: objective.title.trim(),
      value: id,
      ids: [id],
      // Make sure we pass back a list of recipient ids for subsequent saves.
      recipientIds: otherEntityId
        ? [otherEntityId]
        : [],
      isNew: false,
    }];
  }, currentObjectives);

  objectivesToSort.sort((o1, o2) => {
    if (o1.rtrOrder < o2.rtrOrder) {
      return -1;
    }
    return 1;
  });

  return objectivesToSort;
}

export function reduceObjectivesForActivityReport(newObjectives, currentObjectives = []) {
  const objectivesToSort = newObjectives.reduce((objectives, objective) => {
    // check the activity report objective status
    const objectiveStatus = objective.activityReportObjectives
      && objective.activityReportObjectives[0]
      && objective.activityReportObjectives[0].status
      ? objective.activityReportObjectives[0].status : objective.status;

    // objectives represent the accumulator in the find below
    // objective is the objective as it is returned from the API
    const exists = objectives.find((o) => (
      o.title.trim() === objective.title.trim() && o.status === objectiveStatus
    ));

    if (exists) {
      const { id } = objective;
      exists.ids = [...exists.ids, id];

      // we can dedupe these using lodash
      exists.resources = uniqBy([
        ...exists.resources,
        ...(objective.activityReportObjectives
          && objective.activityReportObjectives.length > 0
          ? objective.activityReportObjectives[0].activityReportObjectiveResources
            .map((r) => r.resource.dataValues)
          : []),
      ], (e) => e.value);

      exists.topics = uniqBy([
        ...exists.topics,
        ...(objective.activityReportObjectives
          && objective.activityReportObjectives.length > 0
          ? objective.activityReportObjectives[0].activityReportObjectiveTopics
            .map((t) => t.topic.dataValues)
          : []),
      ], (e) => e.id);

      exists.files = uniqBy([
        ...exists.files,
        ...(objective.activityReportObjectives
          && objective.activityReportObjectives.length > 0
          ? objective.activityReportObjectives[0].activityReportObjectiveFiles
            .map((f) => ({ ...f.file.dataValues, url: f.file.url }))
          : []),
      ], (e) => e.key);

      return objectives;
    }

    // since this method is used to rollup both objectives on and off activity reports
    // we need to handle the case where there is TTA provided and TTA not provided
    // NOTE: there will only be one activity report objective, it is queried by activity report id
    const ttaProvided = objective.activityReportObjectives
        && objective.activityReportObjectives[0]
        && objective.activityReportObjectives[0].ttaProvided
      ? objective.activityReportObjectives[0].ttaProvided : null;
    const arOrder = objective.activityReportObjectives
      && objective.activityReportObjectives[0]
      && objective.activityReportObjectives[0].arOrder
      ? objective.activityReportObjectives[0].arOrder : null;
    const { id } = objective;

    return [...objectives, {
      ...objective.dataValues,
      title: objective.title.trim(),
      value: id,
      ids: [id],
      ttaProvided,
      status: objectiveStatus, // the status from above, derived from the activity report objective
      isNew: false,
      arOrder,

      // for the associated models, we need to return not the direct associations
      // but those associated through an activity report since those reflect the state
      // of the activity report not the state of the objective, which is what
      // we are getting at with this method (getGoalsForReport)

      topics: objective.activityReportObjectives
        && objective.activityReportObjectives.length > 0
        ? objective.activityReportObjectives[0].activityReportObjectiveTopics
          .map((t) => (t.topic ? t.topic.dataValues : null))
          .filter((t) => t)
        : [],
      resources: objective.activityReportObjectives
        && objective.activityReportObjectives.length > 0
        ? objective.activityReportObjectives[0].activityReportObjectiveResources
          .map((r) => r.resource.dataValues)
        : [],
      files: objective.activityReportObjectives
        && objective.activityReportObjectives.length > 0
        ? objective.activityReportObjectives[0].activityReportObjectiveFiles
          .map((f) => ({ ...f.file.dataValues, url: f.file.url }))
        : [],
    }];
  }, currentObjectives);

  // Sort by AR Order in place.
  objectivesToSort.sort((o1, o2) => {
    if (o1.arOrder < o2.arOrder) {
      return -1;
    }
    return 1;
  });
  return objectivesToSort;
}

/**
 *
 * @param {Boolean} forReport
 * @param {Array} newPrompts
 * @param {Array} promptsToReduce
 * @returns Array of reduced prompts
 */
function reducePrompts(forReport, newPrompts = [], promptsToReduce = []) {
  return newPrompts
    ?.reduce((previousPrompts, currentPrompt) => {
      const promptId = currentPrompt.promptId
        ? currentPrompt.promptId : currentPrompt.dataValues.promptId;

      const existingPrompt = previousPrompts.find((pp) => pp.promptId === currentPrompt.promptId);
      if (existingPrompt) {
        if (!forReport) {
          existingPrompt.response = uniq(
            [...existingPrompt.response, ...currentPrompt.responses.flatMap((r) => r.response)],
          );
        }

        if (forReport) {
          existingPrompt.response = uniq(
            [
              ...existingPrompt.response,
              ...(currentPrompt.response || []),
              ...(currentPrompt.reportResponse || []),
            ],
          );
          existingPrompt.reportResponse = uniq(
            [
              ...(existingPrompt.reportResponse || []),
              ...(currentPrompt.reportResponse || []),
            ],
          );
        }
        return previousPrompts;
      }

      const newPrompt = {
        promptId,
        ordinal: currentPrompt.ordinal,
        title: currentPrompt.title,
        prompt: currentPrompt.prompt,
        hint: currentPrompt.hint,
        fieldType: currentPrompt.fieldType,
        options: currentPrompt.options,
        validations: currentPrompt.validations,
      };

      if (forReport) {
        newPrompt.response = uniq(
          [
            ...(currentPrompt.response || []),
            ...(currentPrompt.reportResponse || []),
          ],
        );
        newPrompt.reportResponse = (currentPrompt.reportResponse || []);
      }

      if (!forReport) {
        newPrompt.response = uniq(currentPrompt.responses.flatMap((r) => r.response));
      }

      return [
        ...previousPrompts,
        newPrompt,
      ];
    }, promptsToReduce);
}

/**
 * Dedupes goals by name + status, as well as objectives by title + status
 * @param {Object[]} goals
 * @returns {Object[]} array of deduped goals
 */
function reduceGoals(goals, forReport = false) {
  const objectivesReducer = forReport ? reduceObjectivesForActivityReport : reduceObjectives;

  const where = (g, currentValue) => (forReport
    ? g.name === currentValue.dataValues.name
      && g.status === currentValue.dataValues.status
    : g.name === currentValue.dataValues.name
      && g.status === currentValue.dataValues.status);

  const r = goals.reduce((previousValues, currentValue) => {
    try {
      const existingGoal = previousValues.find((g) => where(g, currentValue));
      if (existingGoal) {
        existingGoal.goalNumbers = [...existingGoal.goalNumbers, currentValue.goalNumber || `G-${currentValue.dataValues.id}`];
        existingGoal.goalIds = [...existingGoal.goalIds, currentValue.dataValues.id];
        existingGoal.grants = [
          ...existingGoal.grants,
          {
            ...currentValue.grant.dataValues,
            recipient: currentValue.grant.recipient.dataValues,
            name: currentValue.grant.name,
            goalId: currentValue.dataValues.id,
            numberWithProgramTypes: currentValue.grant.numberWithProgramTypes,
          },
        ];
        existingGoal.grantIds = [...existingGoal.grantIds, currentValue.grant.id];
        existingGoal.objectives = objectivesReducer(
          currentValue.objectives,
          existingGoal.objectives,
        );
        existingGoal.prompts = reducePrompts(
          forReport,
          currentValue.dataValues.prompts || [],
          existingGoal.prompts || [],
        );
        return previousValues;
      }

      const endDate = (() => {
        const date = moment(currentValue.dataValues.endDate, 'YYYY-MM-DD').format('MM/DD/YYYY');

        if (date === 'Invalid date') {
          return '';
        }

        return date;
      })();

      const goal = {
        ...currentValue.dataValues,
        goalNumbers: [currentValue.goalNumber || `G-${currentValue.dataValues.id}`],
        goalIds: [currentValue.dataValues.id],
        grants: [
          {
            ...currentValue.grant.dataValues,
            numberWithProgramTypes: currentValue.grant.numberWithProgramTypes,
            recipient: currentValue.grant.recipient.dataValues,
            name: currentValue.grant.name,
            goalId: currentValue.dataValues.id,
          },
        ],
        grantIds: [currentValue.grant.id],
        objectives: objectivesReducer(
          currentValue.objectives,
        ),
        prompts: reducePrompts(
          forReport,
          currentValue.dataValues.prompts || [],
          [],
        ),
        isNew: false,
        endDate,
        source: currentValue.dataValues.source,
      };

      return [...previousValues, goal];
    } catch (err) {
      auditLogger.error('Error reducing goal in services/goals reduceGoals, exiting reducer early', err);
      return previousValues;
    }
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
                [Op.notIn]: [
                  OBJECTIVE_STATUS.SUSPENDED,
                  OBJECTIVE_STATUS.COMPLETE,
                ],
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

  const reducedGoals = reduceGoals(goals);

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

export async function goalByIdAndRecipient(id, recipientId) {
  const goal = await Goal.findOne(OPTIONS_FOR_GOAL_FORM_QUERY(id, recipientId));
  goal.objectives = goal.objectives
    .map((objective) => ({
      ...objective.dataValues,
      topics: objective.objectiveTopics
        .map((objectiveTopic) => ({
          ...objectiveTopic.dataValues,
          ...(
            objectiveTopic.topic && objectiveTopic.topic.dataValues
              ? objectiveTopic.topic.dataValues
              : []
          ),
        }))
        .map((o) => ({ ...o, topic: undefined })),
      files: objective.objectiveFiles
        .map((objectiveFile) => ({
          ...objectiveFile.dataValues,
          ...objectiveFile.file.dataValues,
        }))
        .map((f) => ({ ...f, file: undefined })),
      resources: objective.objectiveResources
        .map((objectiveResource) => ({
          ...objectiveResource.dataValues,
          ...objectiveResource.resource.dataValues,
        }))
        .map((r) => ({ ...r, resource: undefined })),
    }))
    .map((objective) => ({ ...objective, objectiveTopics: undefined, objectiveFiles: undefined }));
  return goal;
}

export async function goalsByIdAndRecipient(ids, recipientId) {
  let goals = await Goal.findAll(OPTIONS_FOR_GOAL_FORM_QUERY(ids, recipientId));
  goals = goals.map((goal) => ({
    ...goal,
    objectives: goal.objectives
      .map((objective) => {
        const o = {
          ...objective.dataValues,
          topics: objective.objectiveTopics
            .map((objectiveTopic) => {
              const ot = {
                ...objectiveTopic.dataValues,
                ...(
                  objectiveTopic.topic && objectiveTopic.topic.dataValues
                    ? objectiveTopic.topic.dataValues
                    : []
                ),
              };
              delete ot.topic;
              return ot;
            }),
          files: objective.objectiveFiles
            .map((objectiveFile) => {
              const of = {
                ...objectiveFile.dataValues,
                ...objectiveFile.file.dataValues,
                // url: objectiveFile.file.url,
              };
              delete of.file;
              return of;
            }),
          resources: objective.objectiveResources
            .map((objectiveResource) => {
              const oR = {
                ...objectiveResource.dataValues,
                ...objectiveResource.resource.dataValues,
              };
              delete oR.resource;
              return oR;
            }),
        };
        delete o.objectiveTopics;
        delete o.objectiveFiles;
        return o;
      }),
  }));

  return reduceGoals(goals);
}

export async function goalByIdWithActivityReportsAndRegions(goalId) {
  return Goal.findOne({
    attributes: [
      'name',
      'id',
      'status',
      'createdVia',
      'previousStatus',
    ],
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
        individualHooks: true,
      }),
      ObjectiveResource.destroy({
        where: {
          objectiveId: orphanedObjectiveIds,
        },
        individualHooks: true,
      }),
      ObjectiveTopic.destroy({
        where: {
          objectiveId: orphanedObjectiveIds,
        },
        individualHooks: true,
      }),
    ]);
  }

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
      newGoal = await Goal.findOne({
        where: {
          grantId,
          status: {
            [Op.not]: 'Closed',
          },
          name: options.name.trim(),
        },
      });
      if (!newGoal) {
        newGoal = await Goal.create({
          grantId,
          name: options.name.trim(),
          status: 'Draft', // if we are creating a goal for the first time, it should be set to 'Draft'
          isFromSmartsheetTtaPlan: false,
          rtrOrder: rtrOrder + 1,
        });
      }
    }

    if (isCurated) {
      await setFieldPromptsForCuratedTemplate([newGoal.id], prompts);
    }

    // we can't update this stuff if the goal is on an approved AR
    if (newGoal && !newGoal.onApprovedAR) {
      newGoal.set({
        ...(options && options.name && { name: options.name.trim() }),
      });

      if (newGoal.status !== status) {
        newGoal.set({ status });
      }

      if (!newGoal.createdVia || newGoal.createdVia !== createdVia) {
        newGoal.set({ createdVia: createdVia || (newGoal.isFromSmartsheetTtaPlan ? 'imported' : 'rtr') });
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
              createdVia: 'rtr',
            });
          }
        }

        await objective.update({
          ...(!objective.dataValues.onApprovedAR
            && title.trim() !== objective.dataValues.title.trim()
            && { title }),
          status: objectiveStatus,
          rtrOrder: index + 1,
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
      [sequelize.fn('BOOL_OR', sequelize.literal(`"goalTemplate"."creationMethod" = '${CREATION_METHOD.CURATED}'`)), 'isCurated'],
    ],
    group: ['"Goal"."name"', '"Goal"."status"', '"Goal"."endDate"', '"Goal"."onApprovedAR"', '"Goal"."source"'],
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
      ` SERVICE:GOALS:setActivityReportGoalsAsActivielyEdited\nunable to update ActivityReportGoals table \n${error}`,
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

  // cleanup any ObjectiveFiles that are no longer needed
  await ObjectiveFile.destroy({
    where: {
      objectiveId: objectivesIdsToDestroy,
    },
    individualHooks: true,
  });

  // cleanup any ObjectiveResources that are no longer needed
  await ObjectiveResource.destroy({
    where: {
      objectiveId: objectivesIdsToDestroy,
    },
    individualHooks: true,
  });

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

      await ObjectiveFile.destroy({
        where: {
          objectiveId: objectiveIdsToDestroy,
        },
        individualHooks: true,
      });

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
          createdVia: 'activityReport',
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
        order: index,
      },
    );
    return savedObjective;
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
            name: goal.name.trim(),
            grantId,
            status: { [Op.not]: GOAL_STATUS.CLOSED },
          },
        });
      }

      // if not, we create it
      if (!newOrUpdatedGoal) {
        newOrUpdatedGoal = await Goal.create({
          createdVia: 'activityReport',
          name: goal.name.trim(),
          grantId,
          ...fields,
          status,
        }, { individualHooks: true });
      }

      if (!newOrUpdatedGoal.onApprovedAR) {
        if (source && newOrUpdatedGoal.source !== source) {
          newOrUpdatedGoal.set({ source });
        }

        if (fields.name !== newOrUpdatedGoal.name) {
          newOrUpdatedGoal.set({ name: fields.name.trim() });
        }

        if (endDate && endDate !== 'Invalid date' && endDate !== newOrUpdatedGoal.endDate) {
          newOrUpdatedGoal.set({ endDate });
        }
      }

      if (status && status !== newOrUpdatedGoal.status) {
        newOrUpdatedGoal.set({ status });
      }

      if (prompts) {
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
      );

      // and pass the goal to the objective creation function
      const newGoalObjectives = await createObjectivesForGoal(newOrUpdatedGoal, objectives, report);
      currentObjectives = [...currentObjectives, ...newGoalObjectives];

      return newOrUpdatedGoal;
    }));
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
    [GOAL_STATUS.DRAFT]: [],
    [GOAL_STATUS.NOT_STARTED]: [GOAL_STATUS.CLOSED, GOAL_STATUS.SUSPENDED],
    [GOAL_STATUS.IN_PROGRESS]: [GOAL_STATUS.CLOSED, GOAL_STATUS.SUSPENDED],
    [GOAL_STATUS.SUSPENDED]: [GOAL_STATUS.CLOSED],
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
 * @param {string} oldStatus
 * @param {string} newStatus
 * @param {string} closeSuspendReason
 * @param {string} closeSuspendContext
 * @param {string[]} previousStatus
 * @returns {Promise<Model|boolean>} updated goal
 */
export async function updateGoalStatusById(
  goalIds,
  oldStatus,
  newStatus,
  closeSuspendReason,
  closeSuspendContext,
  previousStatus,
) {
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

  // finally, if everything is golden, we update the goal
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
    attributes: {
      include: [
        [sequelize.literal(`"goalTemplate"."creationMethod" = '${CREATION_METHOD.CURATED}'`), 'isCurated'],
        [sequelize.literal(`(
          SELECT
            jsonb_agg( DISTINCT jsonb_build_object(
              'promptId', gtfp.id ,
              'ordinal', gtfp.ordinal,
              'title', gtfp.title,
              'prompt', gtfp.prompt,
              'hint', gtfp.hint,
              'caution', gtfp.caution,
              'fieldType', gtfp."fieldType",
              'options', gtfp.options,
              'validations', gtfp.validations,
              'response', gfr.response,
              'reportResponse', argfr.response
            ))
          FROM "GoalTemplateFieldPrompts" gtfp
          LEFT JOIN "GoalFieldResponses" gfr
          ON gtfp.id = gfr."goalTemplateFieldPromptId"
          AND gfr."goalId" = "Goal".id
          LEFT JOIN "ActivityReportGoalFieldResponses" argfr
          ON gtfp.id = argfr."goalTemplateFieldPromptId"
          AND argfr."activityReportGoalId" = "activityReportGoals".id
          WHERE "goalTemplate".id = gtfp."goalTemplateId"
          GROUP BY TRUE
        )`), 'prompts'],
      ],
    },
    include: [
      {
        model: GoalTemplate,
        as: 'goalTemplate',
        attributes: [],
        required: false,
      },
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
        separate: true,
        model: Objective,
        as: 'objectives',
        include: [
          {
            required: true,
            model: ActivityReportObjective,
            as: 'activityReportObjectives',
            where: {
              activityReportId: reportId,
            },
            include: [
              {
                separate: true,
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
                separate: true,
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
                separate: true,
                model: ActivityReportObjectiveResource,
                as: 'activityReportObjectiveResources',
                required: false,
                attributes: [['id', 'key']],
                include: [
                  {
                    model: Resource,
                    as: 'resource',
                    attributes: [['url', 'value']],
                  },
                ],
                where: { sourceFields: { [Op.contains]: [SOURCE_FIELD.REPORTOBJECTIVE.RESOURCE] } },
              },
            ],
          },
          {
            model: Topic,
            as: 'topics',
          },
          {
            model: Resource,
            as: 'resources',
            attributes: [['url', 'value']],
            through: {
              attributes: [],
              where: { sourceFields: { [Op.contains]: [SOURCE_FIELD.OBJECTIVE.RESOURCE] } },
              required: false,
            },
            required: false,
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
        individualHooks: true,
      })
      : await Promise.resolve();

    const objectiveResourcesDestroyed = (Array.isArray(objectiveIds) && objectiveIds.length)
      ? await ObjectiveResource.destroy({
        where: {
          objectiveId: { [Op.in]: objectiveIds },
        },
        individualHooks: true,
      })
      : await Promise.resolve();

    const objectiveFilesDestroyed = (Array.isArray(objectiveIds) && objectiveIds.length)
      ? await ObjectiveFile.destroy({
        where: {
          objectiveId: { [Op.in]: objectiveIds },
        },
        individualHooks: true,
      })
      : await Promise.resolve();

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
      objectiveResourcesDestroyed,
      objectiveTopicsDestroyed,
      objectivesDestroyed,
      objectiveFilesDestroyed,
    };
  } catch (error) {
    auditLogger.error(
      `${logContext.namespace} - Sequelize error - unable to delete from db - ${error}`,
    );
    return 0;
  }
}
