import { Sequelize } from 'sequelize';
import { isValidResourceUrl } from '../lib/urlUtils';
import {
  getResourcesForActivityReportObjectives,
  processActivityReportObjectiveForResourcesById,
} from './resource';

const { Op } = require('sequelize');
const {
  Collaborator,
  sequelize,
  ActivityReportGoal,
  ActivityReportObjective,
  ActivityReportObjectiveFile,
  ActivityReportObjectiveResource,
  ActivityReportObjectiveTopic,
  Goal,
  Objective,
  ObjectiveFile,
  ObjectiveResource,
  ObjectiveTopic,
} = require('../models');
const { ENTITY_TYPES } = require('../constants');

const cacheFiles = async (objectiveId, activityReportObjectiveId, files = []) => {
  const fileIds = files.map((file) => file.fileId);
  const filesSet = new Set(fileIds);
  const originalAROFiles = await ActivityReportObjectiveFile.findAll({
    where: { activityReportObjectiveId },
    raw: true,
  });
  const originalFileIds = originalAROFiles.map((originalAROFile) => originalAROFile.fileId);
  const removedFileIds = originalFileIds.filter((fileId) => !filesSet.has(fileId));
  const currentFileIds = new Set(originalFileIds.filter((fileId) => filesSet.has(fileId)));
  const newFilesIds = fileIds.filter((topic) => !currentFileIds.has(topic));

  return Promise.all([
    ...newFilesIds.map(async (fileId) => ActivityReportObjectiveFile.create({
      activityReportObjectiveId,
      fileId,
    })),
    removedFileIds.length > 0
      ? ActivityReportObjectiveFile.destroy({
        where: {
          activityReportObjectiveId,
          fileId: { [Op.in]: removedFileIds },
        },
        individualHooks: true,
        hookMetadata: { objectiveId },
      })
      : Promise.resolve(),
    newFilesIds.length > 0
      ? ObjectiveFile.update(
        { onAR: true },
        {
          where: { fileId: { [Op.in]: newFilesIds } },
          include: [
            {
              model: Objective,
              as: 'objective',
              required: true,
              where: { id: objectiveId },
              include: [
                {
                  model: ActivityReportObjective,
                  as: 'activityReportObjectives',
                  required: true,
                  where: { id: activityReportObjectiveId },
                },
              ],
            },
          ],
        },
      )
      : Promise.resolve(),
  ]);
};

const cacheResources = async (objectiveId, activityReportObjectiveId, resources = []) => {
  const resourceUrls = resources
    .map((r) => {
      if (r.resource && r.resource.url) return r.resource.url;
      if (r.url) return r.url;
      return null;
    })
    .filter((url) => url);
  const resourceIds = resources
    .map((r) => {
      if (r.resource && r.resource.id) return r.resource.id;
      if (r.resourceId) return r.resourceId;
      return null;
    })
    .filter((id) => id);
  const originalAROResources = await getResourcesForActivityReportObjectives(
    activityReportObjectiveId,
    true,
  );
  const aroResources = await processActivityReportObjectiveForResourcesById(
    activityReportObjectiveId,
    resourceUrls,
    resourceIds,
  );
  const newAROResourceIds = aroResources
    && aroResources.length > 0
    ? aroResources
      .filter((r) => !!originalAROResources.find((oR) => oR.id === r.id))
      .map((r) => r.resourceId)
    : [];
  const removedAROResourceIds = originalAROResources
    .filter((oR) => !aroResources?.find((r) => oR.id === r.id))
    .map((r) => r.resourceId);

  return Promise.all([
    newAROResourceIds.length > 0
      ? ObjectiveResource.update(
        { onAR: true },
        {
          where: {
            id: objectiveId,
            onAR: false,
            resourceId: { [Op.in]: newAROResourceIds },
          },
        },
      )
      : Promise.resolve(),
    removedAROResourceIds.length > 0
      ? (async () => {
        const resourceNotOnARs = await ObjectiveResource.findAll({
          attributes: ['id'],
          where: {
            [Op.and]: [
              { objectiveId },
              { onAR: true },
              { resourceId: { [Op.in]: removedAROResourceIds } },
              { '$"objective.activityReportObjectives".id$': { [Op.is]: null } },
            ],
          },
          include: [{
            attributes: [],
            model: Objective,
            as: 'objective',
            required: true,
            include: [{
              attributes: [],
              model: ActivityReportObjective,
              as: 'activityReportObjectives',
              required: false,
              where: { id: { [Op.not]: activityReportObjectiveId } },
              include: [{
                attributes: [],
                model: ActivityReportObjectiveResource,
                as: 'activityReportObjectiveResources',
                required: false,
                where: { resourceId: { [Op.in]: removedAROResourceIds } },
              }],
            }],
          }],
          raw: true,
        });
        return resourceNotOnARs && resourceNotOnARs.length > 0
          ? ObjectiveResource.update(
            { onAR: false },
            { where: { id: resourceNotOnARs.map((r) => r.id) } },
          )
          : Promise.resolve();
      })()
      : Promise.resolve(),
  ]);
};

const cacheTopics = async (objectiveId, activityReportObjectiveId, topics = []) => {
  const topicIds = topics.map((topic) => topic.topicId);
  const topicsSet = new Set(topicIds);
  const originalAROTopics = await ActivityReportObjectiveTopic.findAll({
    where: { activityReportObjectiveId },
    raw: true,
  });
  const originalTopicIds = originalAROTopics.map((originalAROTopic) => originalAROTopic.topicId)
    || [];
  const removedTopicIds = originalTopicIds.filter((topicId) => !topicsSet.has(topicId));
  const currentTopicIds = new Set(originalTopicIds.filter((topicId) => topicsSet.has(topicId)));
  const newTopicsIds = topicIds.filter((topicId) => !currentTopicIds.has(topicId));

  return Promise.all([
    ...newTopicsIds.map(async (topicId) => ActivityReportObjectiveTopic.create({
      activityReportObjectiveId,
      topicId,
    })),
    removedTopicIds.length > 0
      ? ActivityReportObjectiveTopic.destroy({
        where: {
          activityReportObjectiveId,
          topicId: { [Op.in]: removedTopicIds },
        },
        individualHooks: true,
        hookMetadata: { objectiveId },
      })
      : Promise.resolve(),
    newTopicsIds.length > 0
      ? ObjectiveTopic.update(
        { onAR: true },
        {
          where: { topicId: { [Op.in]: newTopicsIds } },
          include: [
            {
              model: Objective,
              as: 'objective',
              required: true,
              where: { id: objectiveId },
              include: [
                {
                  model: ActivityReportObjective,
                  as: 'activityReportObjectives',
                  required: true,
                  where: { id: activityReportObjectiveId },
                },
              ],
            },
          ],
        },
      )
      : Promise.resolve(),
  ]);
};

const cacheObjectiveMetadata = async (objective, reportId, metadata) => {
  const {
    files,
    resources,
    topics,
    ttaProvided,
    status,
    order,
  } = metadata;
  const objectiveId = objective.dataValues
    ? objective.dataValues.id
    : objective.id;
  let aro = await ActivityReportObjective.findOne({
    where: {
      objectiveId,
      activityReportId: reportId,
    },
    raw: true,
  });
  if (!aro) {
    aro = await ActivityReportObjective.create({
      objectiveId,
      activityReportId: reportId,
    }, { raw: true });
  }
  const { id: activityReportObjectiveId } = aro;
  // Updates take longer then selects to settle in the db, as a result this update needs to be
  // complete prior to calling cacheResources to prevent stale data from being returned. This
  // results in the following update cannot be in the Promise.all in the return.
  await ActivityReportObjective.update({
    title: objective.title,
    status: status || objective.status,
    ttaProvided,
    arOrder: order + 1,
  }, {
    where: { id: activityReportObjectiveId },
    individualHooks: true,
  });
  return Promise.all([
    Objective.update({ onAR: true }, {
      where: { id: objectiveId },
      individualHooks: true,
    }),
    cacheFiles(objectiveId, activityReportObjectiveId, files),
    cacheResources(objectiveId, activityReportObjectiveId, resources),
    cacheTopics(objectiveId, activityReportObjectiveId, topics),
  ]);
};

const cacheGoalMetadata = async (goal, reportId, isRttapa, isActivelyBeingEditing) => {
  // first we check to see if the activity report -> goal link already exists
  const arg = await ActivityReportGoal.findOne({
    where: {
      goalId: goal.id,
      activityReportId: reportId,
    },
  });

  // if it does, then we update it with the new values
  if (arg) {
    const activityReportGoalId = arg.id;
    return Promise.all([
      ActivityReportGoal.update({
        name: goal.name,
        status: goal.status,
        timeframe: goal.timeframe,
        closeSuspendReason: goal.closeSuspendReason,
        closeSuspendContext: goal.closeSuspendContext,
        endDate: goal.endDate,
        isRttapa: isRttapa || null,
        isActivelyEdited: isActivelyBeingEditing || false,
      }, {
        where: { id: activityReportGoalId },
        individualHooks: true,
      }),
      Goal.update({ onAR: true }, { where: { id: goal.id }, individualHooks: true }),
    ]);
  }

  // otherwise, we create a new one
  return Promise.all([
    ActivityReportGoal.create({
      goalId: goal.id,
      activityReportId: reportId,
      name: goal.name,
      status: goal.status,
      timeframe: goal.timeframe,
      closeSuspendReason: goal.closeSuspendReason,
      closeSuspendContext: goal.closeSuspendContext,
      endDate: goal.endDate,
      isRttapa: isRttapa || null,
      isActivelyEdited: isActivelyBeingEditing || false,
    }, {
      individualHooks: true,
    }),
    Goal.update({ onAR: true }, { where: { id: goal.id }, individualHooks: true }),
  ]);
};

async function destroyActivityReportObjectiveMetadata(
  activityReportObjectiveIdsToRemove,
  objectiveIds,
) {
  return Array.isArray(activityReportObjectiveIdsToRemove)
  && activityReportObjectiveIdsToRemove.length > 0
    ? Promise.all([
      ActivityReportObjectiveFile.destroy({
        where: {
          activityReportObjectiveId: activityReportObjectiveIdsToRemove,
        },
        hookMetadata: { objectiveIds },
        individualHooks: true,
      }),
      ActivityReportObjectiveResource.destroy({
        where: {
          activityReportObjectiveId: activityReportObjectiveIdsToRemove,
        },
        hookMetadata: { objectiveIds },
        individualHooks: true,
      }),
      ActivityReportObjectiveTopic.destroy({
        where: {
          activityReportObjectiveId: activityReportObjectiveIdsToRemove,
        },
        hookMetadata: { objectiveIds },
        individualHooks: true,
      }),
    ])
    : Promise.resolve();
}

export {
  cacheFiles,
  cacheResources,
  cacheTopics,
  cacheObjectiveMetadata,
  cacheGoalMetadata,
  destroyActivityReportObjectiveMetadata,
};
