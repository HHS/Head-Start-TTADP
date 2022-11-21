const { getSingularOrPluralData } = require('../helpers/hookMetadata');

const recalculateOnAR = async (sequelize, instance, options) => {
  // check to see if objectiveId or objectiveIds is validly defined
  // when defined a more efficient search can be used
  const objectiveIds = getSingularOrPluralData(options, 'objectiveId', 'objectiveIds');

  let topicOnReport;
  if (objectiveIds !== undefined
    && Array.isArray(objectiveIds)
    && objectiveIds.map((i) => typeof i).every((i) => i === 'number')) {
    topicOnReport = `
      SELECT
        t."id",
        COUNT(arot.id) > 0 "onAR"
      FROM "ObjectiveTopics" t
      LEFT JOIN "ActivityReportObjectives" aro
      ON t."objectiveId" = aro."objectiveId"
      JOIN "ActivityReportObjectiveTopics" arot
      ON aro.id = arot."activityReportObjectiveId"
      AND t."topicId" = arot."topicId"
      WHERE t."objectiveId" IN (${objectiveIds.join(',')})
      AND t."topicId" = ${instance.topicId}
      AND aro.id != ${instance.activityReportObjectiveId}
      GROUP BY t."id"`;
  } else {
    topicOnReport = `
     SELECT
        t."id",
        COUNT(arot.id) > 0 "onAR"
      FROM "ObjectiveTopics" t
      JOIN "ActivityReportObjectives" arox
      ON t."objectiveId" = arox."objectiveId"
      LEFT JOIN "ActivityReportObjectives" aro
      ON t."objectiveId" = aro."objectiveId"
      JOIN "ActivityReportObjectiveTopics" arot
      ON aro.id = arot."activityReportObjectiveId"
      AND t."topicId" = arot."topicId"
      WHERE arox.id = ${instance.activityReportObjectiveId}
      AND t."topicId" = ${instance.topicId}
      AND aro.id != ${instance.activityReportObjectiveId}
      GROUP BY t."id"`;
  }

  await sequelize.query(`
    WITH
      "TopicOnReport" AS (${topicOnReport})
    UPDATE "ObjectiveTopics" t
    SET "onAR" = tr."onAR"
    FROM "TopicOnReport" tr
    WHERE t.id = tr.id;
  `, { transaction: options.transaction });
};

const afterDestroy = async (sequelize, instance, options) => {
  await recalculateOnAR(sequelize, instance, options);
};

export {
  recalculateOnAR,
  afterDestroy,
};
