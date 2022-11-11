const { Op } = require('sequelize');
const {
  ActivityReportGoal,
  ActivityReportObjective,
  ActivityReportObjectiveFile,
  ActivityReportObjectiveResource,
  ActivityReportObjectiveTopic,
} = require('../models');

const cacheFiles = async (activityReportObjectiveId, files = []) => Promise.all([
  ...files.map(async ([file]) => ActivityReportObjectiveFile.upsert({
    activityReportObjectiveId,
    fileId: file.fileId,
  }, { returning: true })),
  ActivityReportObjectiveFile.destroy({
    where: {
      activityReportObjectiveId,
      fileId: { [Op.notIn]: files.map(([file]) => file.fileId) },
    },
    individualHooks: true,
  }),
]);

const cacheResources = async (activityReportObjectiveId, resources = []) => Promise.all([
  ...resources.map(async ([resource]) => ActivityReportObjectiveResource.findOrCreate({
    where: {
      activityReportObjectiveId,
      userProvidedUrl: resource.userProvidedUrl,
    },
  })),
  ActivityReportObjectiveResource.destroy({
    where: {
      activityReportObjectiveId,
      userProvidedUrl: { [Op.notIn]: resources.map(([resource]) => resource.userProvidedUrl) },
    },
    individualHooks: true,
  }),
]);

const cacheTopics = async (activityReportObjectiveId, topics = []) => Promise.all([
  ...topics.map(async ([topic]) => ActivityReportObjectiveTopic.upsert({
    activityReportObjectiveId,
    topicId: topic.topicId,
  }, { returning: true })),
  ActivityReportObjectiveTopic.destroy({
    where: {
      activityReportObjectiveId,
      topicId: { [Op.notIn]: topics.map(([topic]) => topic.topicId) },
    },
    individualHooks: true,
  }),
]);

const cacheObjectiveMetadata = async (objective, reportId, metadata) => {
  const {
    files, resources, topics, ttaProvided, status,
  } = metadata;
  const objectiveId = objective.id;
  const [aro] = await ActivityReportObjective.findOrCreate({
    where: {
      objectiveId,
      activityReportId: reportId,
    },
  });
  const activityReportObjectiveId = aro.id;
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

const cacheGoalMetadata = async (goal, reportId, isRttapa) => {
  const [arg] = await ActivityReportGoal.findOrCreate({
    where: {
      goalId: goal.id,
      activityReportId: reportId,
    },
  });
  const activityReportGoalId = arg.id;
  return Promise.all([
    await ActivityReportGoal.update({
      name: goal.name,
      status: goal.status,
      timeframe: goal.timeframe,
      closeSuspendReason: goal.closeSuspendReason,
      closeSuspendContext: goal.closeSuspendContext,
      endDate: goal.endDate,
      isRttapa: isRttapa || null,
    }, {
      where: { id: activityReportGoalId },
      individualHooks: true,
    }),
  ]);
};

async function destroyActivityReportObjectiveMetadata(activityReportObjectiveIdsToRemove) {
  if (!Array.isArray(activityReportObjectiveIdsToRemove)
    || activityReportObjectiveIdsToRemove.length === 0) return Promise.resolve();
  return Promise.all([
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
  ]);
}

export {
  cacheFiles,
  cacheResources,
  cacheTopics,
  cacheObjectiveMetadata,
  cacheGoalMetadata,
  destroyActivityReportObjectiveMetadata,
};
