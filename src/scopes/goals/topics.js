import { Op } from 'sequelize';
import { filterAssociation } from './utils';

const topicFilter = `
SELECT
  DISTINCT "Goal"."id"
FROM "Objectives" "Objectives"
INNER JOIN "ObjectiveTopics" "ObjectiveTopics"
ON "Objectives"."id" = "ObjectiveTopics"."objectiveId"
INNER JOIN "Topics" "Topics"
ON "ObjectiveTopics"."topicId" = "Topics"."id"
INNER JOIN "Goals" "Goal"
ON "Objectives"."goalId" = "Goal"."id"
WHERE "Topics"."name"`;

export function withTopics(topics) {
  return {
    [Op.or]: [
      filterAssociation(topicFilter, topics, false),
    ],
  };
}

export function withoutTopics(topics) {
  return {
    [Op.and]: [
      filterAssociation(topicFilter, topics, true),
    ],
  };
}
