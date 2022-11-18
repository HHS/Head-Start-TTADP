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
      "FileOnReport" AS (
        SELECT
          f."id",
          COUNT(arof.id) > 0 "onAR"
        FROM "ObjectiveFiles" f
        LEFT JOIN "ActivityReportObjectives" aro
        ON f."objectiveId" = aro."objectiveId"
        JOIN "ActivityReportObjectiveFiles" arof
        ON aro.id = arof."activityReportObjectiveId"
        WHERE f."objectiveId" ${objectiveCondition}
        AND f."fileId" = ${instance.fileId}
        AND aro."objectiveId" ${objectiveCondition}
        AND arof."fileId" = ${instance.fileId}
        AND aro.id != ${instance.activityReportObjectiveId}
        GROUP BY f."id"
      )
    UPDATE "ObjectiveFiles" f
    SET "onAR" = fr."onAR"
    FROM "FileOnReport" fr
    WHERE f.id = fr.id;
  `, { transaction: options.transaction });
};

const afterDestroy = async (sequelize, instance, options) => {
  await recalculateOnAR(sequelize, instance, options);
};

export {
  recalculateOnAR,
  afterDestroy,
};
