const recalculateOnAR = async (sequelize, instance, options) => {
  let objectiveCondition;
  if (options.hookMetadata === undefined
    || options.hookMetadata === null) {
    throw new Error('hookMetadata is required for hook to function');
  } else if (options.hookMetadata.objectiveId !== undefined
    && options.hookMetadata.objectiveId !== null) {
    objectiveCondition = ` =  ${options.hookMetadata.objectiveId}`;
  } else if (options.hookMetadata.objectiveIds !== undefined
    && options.hookMetadata.objectiveIds !== null) {
    objectiveCondition = ` IN  (${options.hookMetadata.objectiveId.join(',')})`;
  } else {
    throw new Error('hookMetadata.objectiveId or hookMetadata.objectiveIds is required for hook to function');
  }
  await sequelize.query(`
    WITH
      "ResourceOnReport" AS (
        SELECT
          r."id",
          COUNT(aror.id) > 0 "onAR"
        FROM "ObjectiveResources" r
        LEFT JOIN "ActivityReportObjectives" aro
        ON r."objectiveId" = aro."objectiveId"
        JOIN "ActivityReportObjectiveResources" aror
        ON aro.id = aror."activityReportObjectiveId"
        WHERE r."objectiveId" ${objectiveCondition}
        AND r."userProvidedUrl" = '${instance.userProvidedUrl}'
        AND aro."objectiveId" ${objectiveCondition}
        AND aror."userProvidedUrl" = '${instance.userProvidedUrl}'
        AND aro.id != ${instance.activityReportObjectiveId}
        GROUP BY r."id"
      )
    UPDATE "ObjectiveResources" r
    SET "onAR" = rr."onAR"
    FROM "ResourceOnReport" rr
    WHERE r.id = rr.id;
  `, { transaction: options.transaction });
};

const afterDestroy = async (sequelize, instance, options) => {
  await recalculateOnAR(sequelize, instance, options);
};

export {
  recalculateOnAR,
  afterDestroy,
};
