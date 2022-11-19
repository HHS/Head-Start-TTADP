const recalculateOnAR = async (sequelize, instance, options) => {
  let objectiveIds;
  // check to see if objectiveId or objectiveIds is validly defined
  // when defined a more efficient search can be used
  if (options.hookMetadata !== undefined
    && options.hookMetadata !== null) {
    if (options.hookMetadata.objectiveId !== undefined
    && options.hookMetadata.objectiveId !== null
    && typeof options.hookMetadata.objectiveId === 'number') {
      objectiveIds = [options.hookMetadata.objectiveId];
    } else if (options.hookMetadata.objectiveIds !== undefined
    && options.hookMetadata.objectiveIds !== null
    && Array.isArray(options.hookMetadata.objectiveIds)
    && options.hookMetadata.objectiveIds.map((i) => typeof i).every((i) => i === 'number')) {
      objectiveIds = options.hookMetadata.objectiveIds;
    }
  }

  let resourceOnReport;
  if (objectiveIds !== undefined
    && Array.isArray(objectiveIds)
    && objectiveIds.map((i) => typeof i).every((i) => i === 'number')) {
    resourceOnReport = `
      SELECT
        r."id",
        COUNT(aror.id) > 0 "onAR"
      FROM "ObjectiveResources" r
      LEFT JOIN "ActivityReportObjectives" aro
      ON f."objectiveId" = aro."objectiveId"
      JOIN "ActivityReportObjectiveResources" aror
      ON aro.id = aror."activityReportObjectiveId"
      AND r."userProvidedUrl" = aror."userProvidedUrl"
      WHERE r."objectiveId" IN (${options.hookMetadata.objectiveIds.join(',')})
      AND r."userProvidedUrl" = '${instance.userProvidedUrl}'
      AND aro.id != ${instance.activityReportObjectiveId}
      GROUP BY r."id"`;
  } else {
    resourceOnReport = `
      SELECT
        r."id",
        COUNT(aror.id) > 0 "onAR"
      FROM "ObjectiveResources" r
      JOIN "ActivityReportObjectives" arox
      ON r."objectiveId" = arox."objectiveId"
      LEFT JOIN "ActivityReportObjectives" aro
      ON r."objectiveId" = aro."objectiveId"
      JOIN "ActivityReportObjectiveResources" aror
      ON aro.id = aror."activityReportObjectiveId"
      AND r."userProvidedUrl" = aror."userProvidedUrl"
      WHERE arox.id = ${instance.activityReportObjectiveId}
      AND r."userProvidedUrl" = '${instance.userProvidedUrl}'
      AND aro.id != ${instance.activityReportObjectiveId}
      GROUP BY r."id"`;
  }

  await sequelize.query(`
    WITH
      "ResourceOnReport" AS (${resourceOnReport})
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
