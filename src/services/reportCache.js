import { isValidResourceUrl } from '../lib/urlUtils';

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
  const resourceUrls = resources
    .map((resource) => resource.userProvidedUrl)
    .filter((url) => isValidResourceUrl(url));
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
    order,
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
      arOrder: order + 1,
    }, {
      where: { id: activityReportObjectiveId },
      individualHooks: true,
    }),
    cacheFiles(activityReportObjectiveId, files),
    cacheResources(activityReportObjectiveId, resources),
    cacheTopics(activityReportObjectiveId, topics),
    cacheObjectiveCollaborators(activityReportObjectiveId),
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
      await cacheOGoalCollaborators(activityReportGoalId),
    ]);
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
