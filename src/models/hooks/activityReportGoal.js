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

const afterDestroy = async (sequelize, instance, options) => {
  await recalculateOnAR(sequelize, instance, options);
};

export {
  recalculateOnAR,
  afterDestroy,
};
