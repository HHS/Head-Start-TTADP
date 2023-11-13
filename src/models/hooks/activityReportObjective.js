import { validateChangedOrSetEnums } from '../helpers/enum';

const propagateDestroyToMetadata = async (sequelize, instance, options) => Promise.all(
  [
    sequelize.models.ActivityReportObjectiveFile,
    sequelize.models.ActivityReportObjectiveResource,
    sequelize.models.ActivityReportObjectiveTopic,
  ].map(async (model) => model.destroy({
    where: {
      activityReportObjectiveId: instance.id,
    },
    individualHooks: true,
    hookMetadata: { objectiveId: instance.objectiveId },
    transaction: options.transaction,
  })),
);

const recalculateOnAR = async (sequelize, instance, options) => {
  await sequelize.query(`
    WITH
      "ObjectiveOnReport" AS (
        SELECT
          o."id",
          COUNT(aro.id) > 0 "onAR"
        FROM "Objectives" o
        LEFT JOIN "ActivityReportObjectives" aro
        ON o.id = aro."objectiveId"
        WHERE o."id" = ${instance.objectiveId}
        AND aro.id != ${instance.id}
        GROUP BY o."id"
      )
    UPDATE "Objectives" o
    SET "onAR" = "oor"."onAR"
    FROM "ObjectiveOnReport" oor
    WHERE o.id = oor.id;
  `, { transaction: options.transaction });
};

const beforeValidate = async (sequelize, instance, options) => {
  validateChangedOrSetEnums(sequelize, instance);
};

const beforeDestroy = async (sequelize, instance, options) => {
  await propagateDestroyToMetadata(sequelize, instance, options);
};

const afterDestroy = async (sequelize, instance, options) => {
  await recalculateOnAR(sequelize, instance, options);
};

export {
  propagateDestroyToMetadata,
  recalculateOnAR,
  beforeValidate,
  beforeDestroy,
  afterDestroy,
};
