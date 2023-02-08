import { Sequelize } from 'sequelize';
import { isValidResourceUrl } from '../lib/urlUtils';
import {
  getResourcesForActivityReportObjectives,
  processActivityReportObjectiveForResourcesById,
} from './resource';

const { Op } = require('sequelize');
const {
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
    .map((r) => r.resource.url);
  const originalAROResources = await getResourcesForActivityReportObjectives(
    activityReportObjectiveId,
    true,
  );
  const aroResources = await processActivityReportObjectiveForResourcesById(
    activityReportObjectiveId,
    resourceUrls,
  );
  const newAROResourceIds = aroResources
    .filter((r) => !!originalAROResources.find((oR) => oR.id === r.id))
    .map((r) => r.resourceId);
  const removedAROResourceIds = originalAROResources
    .filter((oR) => !!aroResources.find((r) => oR.id === r.id))
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
      ? ObjectiveResource.update(
        { onAR: false },
        {
          where: {
            id: objectiveId,
            onAR: true,
            resourceId: { [Op.in]: removedAROResourceIds },
            'ActivityReportObjectives.userEventID': { [Op.is]: null },
          },
          include: [{
            model: ActivityReportObjective,
            as: 'ActivityReportObjectives',
            required: false,
            where: { id: { [Op.not]: activityReportObjectiveId } },
          }],
        },
      )
      : Promise.resolve(),
  ]);

  // const originalUrls = originalAROResources.map((resource) => resource.userProvidedUrl);
  // const removedUrls = originalUrls.filter((url) => !resourcesSet.has(url));
  // const currentUrls = new Set(originalUrls.filter((url) => resourcesSet.has(url)));
  // const newUrls = resourceUrls.filter((url) => !currentUrls.has(url));

  // return Promise.all([
  //   ...newUrls.map(async (url) => ActivityReportObjectiveResource.create({
  //     activityReportObjectiveId,
  //     userProvidedUrl: url,
  //   })),
  //   removedUrls.length > 0
  //     ? ActivityReportObjectiveResource.destroy({
  //       where: {
  //         activityReportObjectiveId,
  //         userProvidedUrl: { [Op.in]: removedUrls },
  //       },
  //       individualHooks: true,
  //       hookMetadata: { objectiveId },
  //     })
  //     : Promise.resolve(),
  //   newUrls.length > 0
  //     ? ObjectiveResource.update(
  //       { onAR: true },
  //       {
  //         where: { userProvidedUrl: { [Op.in]: newUrls } },
  //         include: [
  //           {
  //             model: Objective,
  //             as: 'objective',
  //             required: true,
  //             where: { id: objectiveId },
  //             include: [
  //               {
  //                 model: ActivityReportObjective,
  //                 as: 'activityReportObjectives',
  //                 required: true,
  //                 where: { id: activityReportObjectiveId },
  //               },
  //             ],
  //           },
  //         ],
  //       },
  //     )
  //     : Promise.resolve(),
  // ]);
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
    files, resources, topics, ttaProvided, status, order,
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
  return Promise.all([
    ActivityReportObjective.update({
      title: objective.title,
      status: status || objective.status,
      ttaProvided,
      arOrder: order + 1,
    }, {
      where: { id: activityReportObjectiveId },
      individualHooks: true,
    }),
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
