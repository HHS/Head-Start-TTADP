/* eslint-disable max-len */
import { Op } from 'sequelize';
import { sequelize } from '../../models';
import filterArray, { filterAssociation } from './utils';

const topicTypes = `
    SELECT
      DISTINCT "ActivityReportObjectives"."activityReportId"
    FROM "ActivityReportObjectives" "ActivityReportObjectives"
    INNER JOIN "ActivityReportObjectiveTopics" "ActivityReportObjectiveTopics"
    ON "ActivityReportObjectives".id = "ActivityReportObjectiveTopics"."activityReportObjectiveId"
    INNER JOIN "Topics" "Topics"
    ON "ActivityReportObjectiveTopics"."topicId" = "Topics"."id"
    WHERE "Topics"."name"`;

export function withTopics(topics) {
  const arTopicsQuery = filterArray('ARRAY_TO_STRING("topics", \',\')', topics, false);
  const objectiveTopicsQuery = filterAssociation(topicTypes, topics, false, '~*');
  const combinedQuery = {
    [Op.or]: [...arTopicsQuery[Op.or].map((t) => t), ...objectiveTopicsQuery[Op.or].map((t) => t)],
  };
  return combinedQuery;
}

export function withoutTopics(topics) {
  const arTopicsQuery = filterArray('ARRAY_TO_STRING("topics", \',\')', topics, true);
  const objectiveTopicsQuery = filterAssociation(topicTypes, topics, true, '~*');
  const combinedQuery = {
    [Op.or]:
    [
      { [Op.and]: [...arTopicsQuery[Op.or][0][Op.and].map((t) => t), ...objectiveTopicsQuery[Op.and].map((t) => t)] },
      sequelize.literal('"topics" IS NULL'),
    ],
  };
  return combinedQuery;
}
