const { Op } = require('sequelize');
const {
  ActivityReportGoal,
  ActivityReportObjective,
  ActivityReportObjectiveFile,
  ActivityReportObjectiveResource,
  ActivityReportObjectiveTopic,
} = require('../models');

const cacheFiles = async (activityReportObjectiveId, files = []) => {
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
      })
      : Promise.resolve(),
  ]);
};

const cacheResources = async (activityReportObjectiveId, resources = []) => {
  const resourceUrls = resources.map((resource) => resource.userProvidedUrl);
  const resourcesSet = new Set(resourceUrls);
  const originalAROResources = await ActivityReportObjectiveResource.findAll({
    where: { activityReportObjectiveId },
    raw: true,
  });
  const originalUrls = originalAROResources.map((resource) => resource.userProvidedUrl);
  const removedUrls = originalUrls.filter((url) => !resourcesSet.has(url));
  const currentUrls = new Set(originalUrls.filter((url) => resourcesSet.has(url)));
  const newUrls = resourceUrls.filter((url) => !currentUrls.has(url));

  return Promise.all([
    ...newUrls.map(async (url) => ActivityReportObjectiveResource.create({
      activityReportObjectiveId,
      userProvidedUrl: url,
    })),
    removedUrls.length > 0
      ? ActivityReportObjectiveResource.destroy({
        where: {
          activityReportObjectiveId,
          userProvidedUrl: { [Op.in]: removedUrls },
        },
        individualHooks: true,
      })
      : Promise.resolve(),
  ]);
};

const cacheTopics = async (activityReportObjectiveId, topics = []) => {
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
      })
      : Promise.resolve(),
  ]);
};

const cacheObjectiveMetadata = async (objective, reportId, metadata) => {
  const {
    files, resources, topics, ttaProvided, status,
  } = metadata;
  const objectiveId = objective.id;
  let aro = await ActivityReportObjective.findOne({
    where: {
      objectiveId,
      activityReportId: reportId,
    },
  });
  if (!aro) {
    aro = await ActivityReportObjective.create({
      objectiveId,
      activityReportId: reportId,
    });
  }
  const { id: activityReportObjectiveId } = aro;
  return Promise.all([
    ActivityReportObjective.update({
      title: objective.title,
      status: status || objective.status,
      ttaProvided,
    }, {
      where: { id: activityReportObjectiveId },
      individualHooks: true,
    }),
    cacheFiles(activityReportObjectiveId, files),
    cacheResources(activityReportObjectiveId, resources),
    cacheTopics(activityReportObjectiveId, topics),
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
    return ActivityReportGoal.update({
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
    });
  }

  // otherwise, we create a new one
  return ActivityReportGoal.create({
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
  });
};

async function destroyActivityReportObjectiveMetadata(activityReportObjectiveIdsToRemove) {
  return Array.isArray(activityReportObjectiveIdsToRemove)
  && activityReportObjectiveIdsToRemove.length > 0
    ? Promise.all([
      ActivityReportObjectiveFile.destroy({
        where: {
          activityReportObjectiveId: activityReportObjectiveIdsToRemove,
        },
      }),
      ActivityReportObjectiveResource.destroy({
        where: {
          activityReportObjectiveId: activityReportObjectiveIdsToRemove,
        },
      }),
      ActivityReportObjectiveTopic.destroy({
        where: {
          activityReportObjectiveId: activityReportObjectiveIdsToRemove,
        },
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
