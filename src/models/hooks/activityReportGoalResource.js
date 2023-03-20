const { getSingularOrPluralData } = require('../helpers/hookMetadata');

const propagateOnAR = async (sequelize, instance, options) => sequelize.models.GoalResource
  .update(
    { onAR: true },
    {
      where: { resourceId: instance.resourceId },
      include: [{
        model: sequelize.models.Goal,
        as: 'goal',
        include: [{
          model: sequelize.models.ActivityReportGoal,
          as: 'activityReportGoal',
          where: { id: instance.activityReportGoalId },
        }],
      }],
      transaction: options.transaction,
    },
  );

const recalculateOnAR = async (sequelize, instance, options) => {
  // check to see if goalId or goalIds is validly defined
  // when defined a more efficient search can be used
  const goalIds = getSingularOrPluralData(options, 'goalId', 'goalIds');

  let resourceOnReport;
  // by using the passed in goals we can use a more performant version of the query
  if (goalIds !== undefined
    && Array.isArray(goalIds)
    && goalIds.map((i) => typeof i).every((i) => i === 'number')) {
    resourceOnReport = `
      SELECT
        r."id",
        COUNT(aror.id) > 0 "onAR"
      FROM "GoalResources" r
      LEFT JOIN "ActivityReportGoals" aro
      ON r."goalId" = aro."goalId"
      JOIN "ActivityReportGoalResources" aror
      ON aro.id = aror."activityReportGoalId"
      AND r."resourceId" = aror."resourceId"
      WHERE r."goalId" IN (${goalIds.join(',')})
      AND r."resourceId" = ${instance.resourceId}
      AND aro.id != ${instance.activityReportGoalId}
      GROUP BY r."id"`;
  } else {
    resourceOnReport = `
      SELECT
        r."id",
        COUNT(aror.id) > 0 "onAR"
      FROM "GoalResources" r
      JOIN "ActivityReportGoals" arox
      ON r."goalId" = arox."goalId"
      LEFT JOIN "ActivityReportGoals" aro
      ON r."goalId" = aro."goalId"
      JOIN "ActivityReportGoalResources" aror
      ON aro.id = aror."activityReportGoalId"
      AND r."resourceId" = aror."resourceId"
      WHERE arox.id = ${instance.activityReportGoalId}
      AND r."resourceId" = ${instance.resourceId}
      AND aro.id != ${instance.activityReportGoalId}
      GROUP BY r."id"`;
  }

  await sequelize.query(`
    WITH
      "ResourceOnReport" AS (${resourceOnReport})
    UPDATE "GoalResources" r
    SET "onAR" = rr."onAR"
    FROM "ResourceOnReport" rr
    WHERE r.id = rr.id;
  `, { transaction: options.transaction });
};

const afterCreate = async (sequelize, instance, options) => {
  await propagateOnAR(sequelize, instance, options);
};

const afterDestroy = async (sequelize, instance, options) => {
  await recalculateOnAR(sequelize, instance, options);
};

export {
  propagateOnAR,
  recalculateOnAR,
  afterCreate,
  afterDestroy,
};
