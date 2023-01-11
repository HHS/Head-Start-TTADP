const { getSingularOrPluralData } = require('../helpers/hookMetadata');

const recalculateOnAR = async (sequelize, instance, options) => {
  // check to see if objectiveId or objectiveIds is validly defined
  // when defined a more efficient search can be used
  const objectiveIds = getSingularOrPluralData(options, 'objectiveId', 'objectiveIds');

  let fileOnReport;
  if (objectiveIds !== undefined
    && Array.isArray(objectiveIds)
    && objectiveIds.map((i) => typeof i).every((i) => i === 'number')) {
    fileOnReport = `
      SELECT
        f."id",
        COUNT(arof.id) > 0 "onAR"
      FROM "ObjectiveFiles" f
      LEFT JOIN "ActivityReportObjectives" aro
      ON f."objectiveId" = aro."objectiveId"
      JOIN "ActivityReportObjectiveFiles" arof
      ON aro.id = arof."activityReportObjectiveId"
      AND f."fileId" = arof."fileId"
      WHERE f."objectiveId" IN (${objectiveIds.join(',')})
      AND f."fileId" = ${instance.fileId}
      AND aro.id != ${instance.activityReportObjectiveId}
      GROUP BY f."id"`;
  } else {
    fileOnReport = `
      SELECT
        f."id",
        COUNT(arof.id) > 0 "onAR"
      FROM "ObjectiveFiles" f
      JOIN "ActivityReportObjectives" arox
      ON f."objectiveId" = arox."objectiveId"
      LEFT JOIN "ActivityReportObjectives" aro
      ON f."objectiveId" = aro."objectiveId"
      JOIN "ActivityReportObjectiveFiles" arof
      ON aro.id = arof."activityReportObjectiveId"
      AND f."fileId" = arof."fileId"
      WHERE arox.id = ${instance.activityReportObjectiveId}
      AND f."fileId" = ${instance.fileId}
      AND aro.id != ${instance.activityReportObjectiveId}
      GROUP BY f."id"`;
  }

  await sequelize.query(`
    WITH
      "FileOnReport" AS (${fileOnReport})
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
