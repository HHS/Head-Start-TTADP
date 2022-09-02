const { Op } = require('sequelize');
const {
  ActivityReportGoal,
  ActivityReportObjective,
  ActivityReportObjectiveFile,
  ActivityReportObjectiveResource,
  ActivityReportObjectiveRole,
  ActivityReportObjectiveTopic,
} = require('../models');

const cacheFiles = async (activityReportObjectiveId, files = []) => Promise.all([
  await Promise.all(files.map(async ([file]) => ActivityReportObjectiveFile.upsert({
    activityReportObjectiveId,
    fileId: file.fileId,
  }, { returning: true }))),
  await ActivityReportObjectiveFile.destroy({
    where: {
      activityReportObjectiveId,
      fileId: { [Op.notIn]: files.map(([file]) => file.fileId) },
    },
    individualHooks: true,
  }),
]);

const cacheResources = async (activityReportObjectiveId, resources = []) => Promise.all([
  await Promise.all(resources.map(async ([resource]) => ActivityReportObjectiveResource.upsert({
    activityReportObjectiveId,
    userProvidedUrl: resource.userProvidedUrl,
  }, { returning: true }))),
  await ActivityReportObjectiveResource.destroy({
    where: {
      activityReportObjectiveId,
      userProvidedUrl: { [Op.notIn]: resources.map(([resource]) => resource.userProvidedUrl) },
    },
    individualHooks: true,
  }),
]);

const cacheRoles = async (activityReportObjectiveId, roles = []) => Promise.all([
  await Promise.all(roles.map(async (role) => ActivityReportObjectiveRole.upsert({
    activityReportObjectiveId,
    roleId: role.roleId,
  }, { returning: true }))),
  await ActivityReportObjectiveRole.destroy({
    where: {
      activityReportObjectiveId,
      roleId: { [Op.notIn]: roles.map((role) => role.roleId) },
    },
    individualHooks: true,
  }),
]);

const cacheTopics = async (activityReportObjectiveId, topics = []) => Promise.all([
  await Promise.all(topics.map(async ([topic]) => ActivityReportObjectiveTopic.upsert({
    activityReportObjectiveId,
    topicId: topic.topicId,
  }, { returning: true }))),
  await ActivityReportObjectiveTopic.destroy({
    where: {
      activityReportObjectiveId,
      topicId: { [Op.notIn]: topics.map(([topic]) => topic.topicId) },
    },
    individualHooks: true,
  }),
]);

const cacheObjectiveMetadata = async (objective, reportId, metadata) => {
  const {
    files, resources, roles, topics, ttaProvided,
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
    await ActivityReportObjective.update({
      title: objective.title,
      status: objective.status,
      ttaProvided,
    }, {
      where: { id: activityReportObjectiveId },
      individualHooks: true,
    }),
    await cacheFiles(activityReportObjectiveId, files),
    await cacheResources(activityReportObjectiveId, resources),
    await cacheRoles(activityReportObjectiveId, roles),
    await cacheTopics(activityReportObjectiveId, topics),
  ]);
};

const cacheGoalMetadata = async (goal, reportId) => {
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
    }, {
      where: { id: activityReportGoalId },
      individualHooks: true,
    }),
  ]);
};

export {
  cacheFiles,
  cacheResources,
  cacheRoles,
  cacheTopics,
  cacheObjectiveMetadata,
  cacheGoalMetadata,
};
