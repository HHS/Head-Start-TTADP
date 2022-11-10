const { Op } = require('sequelize');
const {
  ActivityReportGoal,
  ActivityReportObjective,
  ActivityReportObjectiveFile,
  ActivityReportObjectiveResource,
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
  // eslint-disable-next-line max-len
  await Promise.all(resources.map(async ([resource]) => {
    let aror = await ActivityReportObjectiveResource.findOne({
      where: {
        activityReportObjectiveId,
        userProvidedUrl: resource.userProvidedUrl,
      },
    });
    if (!aror) {
      aror = await ActivityReportObjectiveResource.create({
        activityReportObjectiveId,
        userProvidedUrl: resource.userProvidedUrl,
      });
    }
    return aror;
  })),
  // ActivityReportObjectiveResource.findOrCreate({
  //   where: {
  //     activityReportObjectiveId,
  //     userProvidedUrl: resource.userProvidedUrl,
  //   },
  // }))),
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

const cacheObjectiveMetadata = async (objective, reportId, metadata) => {
  const {
    files, resources, topics, ttaProvided, status,
  } = metadata;
  const objectiveId = objective.id;
  // const [aro] = await ActivityReportObjective.findOrCreate({
  //   where: {
  //     objectiveId,
  //     activityReportId: reportId,
  //   },
  // });
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
  const activityReportObjectiveId = aro.id;
  return Promise.all([
    await ActivityReportObjective.update({
      title: objective.title,
      status: status || objective.status,
      ttaProvided,
    }, {
      where: { id: activityReportObjectiveId },
      individualHooks: true,
    }),
    await cacheFiles(activityReportObjectiveId, files),
    await cacheResources(activityReportObjectiveId, resources),
    await cacheTopics(activityReportObjectiveId, topics),
  ]);
};

const cacheGoalMetadata = async (goal, reportId, isRttapa) => {
  // const [arg] = await ActivityReportGoal.findOrCreate({
  //   where: {
  //     goalId: goal.id,
  //     activityReportId: reportId,
  //   },
  // });
  let arg = await ActivityReportGoal.findOne({
    where: {
      goalId: goal.id,
      activityReportId: reportId,
    },
  });
  if (!arg) {
    arg = await ActivityReportGoal.create({
      goalId: goal.id,
      activityReportId: reportId,
    });
  }
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
