const { Op } = require('sequelize');
const {
  Collaborator,
  Objective,
  Goal,
  ActivityReportGoal,
  ActivityReportObjective,
  ActivityReportObjectiveFile,
  ActivityReportObjectiveResource,
  ActivityReportObjectiveTopic,
} = require('../models');
const { ENTITY_TYPES } = require('../constants');
const { upsertCollaborator } = require('./collaborators');

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
  // eslint-disable-next-line max-len
  await Promise.all(resources.map(async ([resource]) => ActivityReportObjectiveResource.findOrCreate({
    where: {
      activityReportObjectiveId,
      userProvidedUrl: resource.userProvidedUrl,
    },
  }))),
  await ActivityReportObjectiveResource.destroy({
    where: {
      activityReportObjectiveId,
      userProvidedUrl: { [Op.notIn]: resources.map(([resource]) => resource.userProvidedUrl) },
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

const cacheObjectiveCollaborators = async (activityReportObjectiveId) => {
  const currentCollaborators = await Collaborator.findAll({
    attributes: [
      'collaboratorTypes',
      'userId',
      'status',
      'note',
      'tier',
    ],
    include: [{
      attributes: [],
      model: Objective,
      as: 'objective',
      include: [{
        attributes: [],
        model: ActivityReportObjective,
        as: 'activityReportObjectives',
        where: { id: activityReportObjectiveId },
        required: true,
      }],
      required: true,
    }],
  });
  return Promise.all([
    ...currentCollaborators.map(async (collaborator) => upsertCollaborator({
      entityType: ENTITY_TYPES.REPORTOBJECTIVE,
      entityId: activityReportObjectiveId,
      collaboratorTypes: collaborator.collaboratorTypes,
      userId: collaborator.userId,
      status: collaborator.status,
      note: collaborator.note,
      tier: collaborator.tier,
    })),
    await Collaborator.destroy({
      where: {
        entityType: ENTITY_TYPES.REPORTOBJECTIVE,
        entityId: activityReportObjectiveId,
        userId: { [Op.notIn]: currentCollaborators.map((collaborator) => collaborator.userId) },
      },
      individualHooks: true,
    }),
  ]);
};

const cacheOGoalCollaborators = async (activityReportGoalId) => {
  const currentCollaborators = await Collaborator.findAll({
    attributes: [
      'collaboratorTypes',
      'userId',
      'status',
      'note',
      'tier',
    ],
    include: [{
      attributes: [],
      model: Goal,
      as: 'goal',
      include: [{
        attributes: [],
        model: ActivityReportGoal,
        as: 'activityReportGoals',
        where: { id: activityReportGoalId },
        required: true,
      }],
      required: true,
    }],
  });
  return Promise.all([
    ...currentCollaborators.map(async (collaborator) => upsertCollaborator({
      entityType: ENTITY_TYPES.REPORTGOAL,
      entityId: activityReportGoalId,
      collaboratorTypes: collaborator.collaboratorTypes,
      userId: collaborator.userId,
      status: collaborator.status,
      note: collaborator.note,
      tier: collaborator.tier,
    })),
    await Collaborator.destroy({
      where: {
        entityType: ENTITY_TYPES.REPORTGOAL,
        entityId: activityReportGoalId,
        userId: { [Op.notIn]: currentCollaborators.map((collaborator) => collaborator.userId) },
      },
      individualHooks: true,
    }),
  ]);
};

const cacheObjectiveMetadata = async (objective, reportId, metadata) => {
  const {
    files,
    resources,
    topics,
    ttaProvided,
    status,
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
      status,
      ttaProvided,
    }, {
      where: { id: activityReportObjectiveId },
      individualHooks: true,
    }),
    await cacheFiles(activityReportObjectiveId, files),
    await cacheResources(activityReportObjectiveId, resources),
    await cacheTopics(activityReportObjectiveId, topics),
    await cacheObjectiveCollaborators(activityReportObjectiveId),
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
    await cacheOGoalCollaborators(activityReportGoalId),
  ]);
};

async function destroyActivityReportObjectiveMetadata(activityReportObjectiveIdsToRemove) {
  return Promise.all([
    ActivityReportObjectiveFile.destroy({
      where: {
        activityReportObjectiveId: activityReportObjectiveIdsToRemove,
      },
      individualHooks: true,
    }),
    ActivityReportObjectiveResource.destroy({
      where: {
        activityReportObjectiveId: activityReportObjectiveIdsToRemove,
      },
      individualHooks: true,
    }),
    ActivityReportObjectiveTopic.destroy({
      where: {
        activityReportObjectiveId: activityReportObjectiveIdsToRemove,
      },
      individualHooks: true,
    }),
    Collaborator.destroy({
      where: {
        entityType: ENTITY_TYPES.REPORTOBJECTIVE,
        entityId: activityReportObjectiveIdsToRemove,
      },
      individualHooks: true,
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
