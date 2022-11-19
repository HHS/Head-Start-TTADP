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
    objectiveCondition = ` IN  (${options.hookMetadata.objectiveIds.join(',')})`;
  } else {
    throw new Error('hookMetadata.objectiveId or hookMetadata.objectiveIds is required for hook to function');
  }
  try {
  await sequelize.query(`
    WITH
      "TopicOnReport" AS (
        SELECT
          t."id",
          COUNT(arot.id) > 0 "onAR"
        FROM "ObjectiveTopics" t
        LEFT JOIN "ActivityReportObjectives" aro
        ON t."objectiveId" = aro."objectiveId"
        JOIN "ActivityReportObjectiveTopics" arot
        ON aro.id = arot."activityReportObjectiveId"
        WHERE t."objectiveId" ${objectiveCondition}
        AND t."topicId" = ${instance.topicId}
        AND aro."objectiveId" ${objectiveCondition}
        AND arot."topicId" = ${instance.topicId}
        AND aro.id != ${instance.activityReportObjectiveId}
        GROUP BY t."id"
      )
    UPDATE "ObjectiveTopics" t
    SET "onAR" = tr."onAR"
    FROM "TopicOnReport" tr
    WHERE t.id = tr.id;
  `, { transaction: options.transaction });
} catch (e) { console.error(JSON.stringify({ name: 'topic', e })); }
};

const afterDestroy = async (sequelize, instance, options) => {
  await recalculateOnAR(sequelize, instance, options);
};

export {
  recalculateOnAR,
  afterDestroy,
};
