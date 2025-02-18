/* eslint-disable max-len */
import { Op } from 'sequelize';
import { sequelize } from '../../models';

const getArTopicsSql = (topicsString) => `
      WITH unnested_topics AS (
          SELECT "id", unnest("topics") as name FROM "ActivityReports"
      )
      SELECT
      DISTINCT "unnested_topics"."id"
      FROM "unnested_topics" "unnested_topics"
      WHERE "unnested_topics"."name" IN (${topicsString})`;

const getTopicsSql = (topicsString) => `
    SELECT
      DISTINCT "ActivityReportObjectives"."activityReportId"
    FROM "ActivityReportObjectives" "ActivityReportObjectives"
    INNER JOIN "ActivityReportObjectiveTopics" "ActivityReportObjectiveTopics"
    ON "ActivityReportObjectives".id = "ActivityReportObjectiveTopics"."activityReportObjectiveId"
    INNER JOIN "Topics" "Topics"
    ON "ActivityReportObjectiveTopics"."topicId" = "Topics"."id"
    WHERE "Topics"."name" IN (${topicsString})`;

export function withTopics(topics) {
  const topicsString = topics.map((t) => `'${t}'`).join(',');
  const arTopicsQuery = getArTopicsSql(topicsString);
  const topicsQuery = getTopicsSql(topicsString);
  const combinedQuery = {
    [Op.or]: [
      sequelize.literal(`("ActivityReport"."id" IN (${arTopicsQuery}))`),
      sequelize.literal(`("ActivityReport"."id" IN (${topicsQuery}))`),
    ],
  };
  return combinedQuery;
}

export function withoutTopics(topics) {
  const topicsString = topics.map((t) => `'${t}'`).join(',');
  const arTopicsQuery = getArTopicsSql(topicsString);
  const topicsQuery = getTopicsSql(topicsString);
  const combinedQuery = {
    [Op.or]: [{
      [Op.and]: [
        sequelize.literal(`("ActivityReport"."id" NOT IN (${arTopicsQuery}))`),
        sequelize.literal(`("ActivityReport"."id" NOT IN (${topicsQuery}))`),
      ],
    },
    sequelize.literal('"topics" IS NULL'),
    ],
  };
  return combinedQuery;
}
