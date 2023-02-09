const processForEmbeddedResources = async (sequelize, instance, options) => {
  // eslint-disable-next-line global-require
  const { calculateIsAutoDetectedForActivityReportGoal, processActivityReportGoalForResourcesById } = require('../../services/resource');
  const changed = instance.changed() || Object.keys(instance);
  if (calculateIsAutoDetectedForActivityReportGoal(changed)) {
    await processActivityReportGoalForResourcesById(instance.id);
  }
};

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

const afterCreate = async (sequelize, instance, options) => {
  await processForEmbeddedResources(sequelize, instance, options);
};

const afterDestroy = async (sequelize, instance, options) => {
  await recalculateOnAR(sequelize, instance, options);
};

const afterUpdate = async (sequelize, instance, options) => {
  await processForEmbeddedResources(sequelize, instance, options);
};

export {
  processForEmbeddedResources,
  recalculateOnAR,
  afterCreate,
  afterDestroy,
  afterUpdate,
};
