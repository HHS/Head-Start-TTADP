const { REPORT_STATUSES } = require('@ttahub/common');
const { GOAL_COLLABORATORS } = require('../../constants');
const {
  currentUserPopulateCollaboratorForType,
  removeCollaboratorsForType,
} = require('../helpers/genericCollaborator');

const processForEmbeddedResources = async (sequelize, instance, options) => {
  // eslint-disable-next-line global-require
  const { calculateIsAutoDetectedForActivityReportGoal, processActivityReportGoalForResourcesById } = require('../../services/resource');
  const changed = instance.changed() || Object.keys(instance);
  if (calculateIsAutoDetectedForActivityReportGoal(changed)) {
    await processActivityReportGoalForResourcesById(instance.id);
  }
};

const propagateDestroyToMetadata = async (sequelize, instance, options) => Promise.all(
  [
    sequelize.models.ActivityReportGoalResource,
    sequelize.models.ActivityReportGoalFieldResponse,
  ].map(async (model) => model.destroy({
    where: {
      activityReportGoalId: instance.id,
    },
    individualHooks: true,
    hookMetadata: { goalId: instance.goalId },
    transaction: options.transaction,
  })),
);

const recalculateOnAR = async (sequelize, instance, options) => {
  await sequelize.query(`
    WITH
      "GoalOnReport" AS (
        SELECT
          g."id",
          COUNT(arg.id) > 0 "onAR"
        FROM "Goals" g
        LEFT JOIN "ActivityReportGoals" arg
        ON g.id = arg."goalId"
        WHERE g."id" = ${instance.goalId}
        AND arg.id != ${instance.id}
        GROUP BY g."id"
      )
    UPDATE "Goals" g
    SET "onAR" = gr."onAR"
    FROM "GoalOnReport" gr
    WHERE g.id = gr.id;
  `, { transaction: options.transaction });
};

const autoPopulateLinker = async (sequelize, instance, options) => {
  const { goalId, activityReportId } = instance;
  return currentUserPopulateCollaboratorForType(
    'goal',
    sequelize,
    options.transaction,
    goalId,
    GOAL_COLLABORATORS.LINKER,
    { activityReportIds: [activityReportId] },
  );
};

const autoCleanupLinker = async (sequelize, instance, options) => {
  const { goalId, activityReportId } = instance;
  return removeCollaboratorsForType(
    'goal',
    sequelize,
    options.transaction,
    goalId,
    GOAL_COLLABORATORS.LINKER,
    { activityReportIds: [activityReportId] },
  );
};

const afterCreate = async (sequelize, instance, options) => {
  await processForEmbeddedResources(sequelize, instance, options);
  await autoPopulateLinker(sequelize, instance, options);
};

const beforeValidate = async (sequelize, instance, options) => {
  if (!Array.isArray(options.fields)) {
    options.fields = []; //eslint-disable-line
  }
};

const beforeDestroy = async (sequelize, instance, options) => {
  await propagateDestroyToMetadata(sequelize, instance, options);
  await autoCleanupLinker(sequelize, instance, options);
};

const afterDestroy = async (sequelize, instance, options) => {
  await recalculateOnAR(sequelize, instance, options);
};

const afterUpdate = async (sequelize, instance, options) => {
  await processForEmbeddedResources(sequelize, instance, options);
};

export {
  beforeValidate,
  processForEmbeddedResources,
  recalculateOnAR,
  propagateDestroyToMetadata,
  afterCreate,
  beforeDestroy,
  afterDestroy,
  afterUpdate,
};
