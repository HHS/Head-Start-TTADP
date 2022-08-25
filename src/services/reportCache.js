const { Op } = require('sequelize');
const {
  ActivityReportGoal,
  ActivityReportObjective,
  ObjectiveFile,
  ObjectiveResource,
  ObjectiveRole,
  ObjectiveTopic,
  ActivityReportObjectiveFile,
  ActivityReportObjectiveResource,
  ActivityReportObjectiveRole,
  ActivityReportObjectiveTopic,
} = require('../models');

const cacheFiles = async (objectiveId, activityReportObjectiveId) => {
  const files = await ObjectiveFile.findAll({ where: { objectiveId } });
  return Promise.all([
    await Promise.all(files.map(async (file) => ActivityReportObjectiveFile.upsert({
      activityReportObjectiveId,
      fileId: file.fileId,
    }, { returning: true }))),
    await ActivityReportObjectiveFile.destroy({
      where: {
        activityReportObjectiveId,
        fileId: { [Op.notIn]: files.map((file) => file.fileId) },
      },
      individualHooks: true,
    }),
  ]);
};

const cacheResources = async (objectiveId, activityReportObjectiveId) => {
  const resources = await ObjectiveResource.findAll({ where: { objectiveId } });
  return Promise.all([
    await Promise.all(resources.map(async (resource) => ActivityReportObjectiveResource.upsert({
      activityReportObjectiveId,
      userProvidedUrl: resource.userProvidedUrl,
    }, { returning: true }))),
    await ActivityReportObjectiveResource.destroy({
      where: {
        activityReportObjectiveId,
        userProvidedUrl: { [Op.notIn]: resources.map((resource) => resource.userProvidedUrl) },
      },
      individualHooks: true,
    }),
  ]);
};

const cacheRoles = async (objectiveId, activityReportObjectiveId) => {
  const roles = await ObjectiveRole.findAll({ where: { objectiveId } });
  return Promise.all([
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
};

const cacheTopics = async (objectiveId, activityReportObjectiveId) => {
  const topics = await ObjectiveTopic.findAll({ where: { objectiveId } });
  return Promise.all([
    await Promise.all(topics.map(async (topic) => ActivityReportObjectiveTopic.upsert({
      activityReportObjectiveId,
      topicId: topic.topicId,
    }, { returning: true }))),
    await ActivityReportObjectiveTopic.destroy({
      where: {
        activityReportObjectiveId,
        topicId: { [Op.notIn]: topics.map((topic) => topic.topicId) },
      },
      individualHooks: true,
    }),
  ]);
};

const cacheObjectiveMetadata = async (objective, reportId, ttaProvided) => {
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
    await cacheFiles(objectiveId, activityReportObjectiveId),
    await cacheResources(objectiveId, activityReportObjectiveId),
    await cacheRoles(objectiveId, activityReportObjectiveId),
    await cacheTopics(objectiveId, activityReportObjectiveId),
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
