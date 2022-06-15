import { Op } from 'sequelize';
import { filterAssociation } from './utils';

/*
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
*/

const topicFilter = `
SELECT DISTINCT g.id
FROM "ActivityReports" ar
INNER JOIN "ActivityReportObjectives" aro ON ar."id" = aro."activityReportId"
INNER JOIN "Objectives" o ON aro."objectiveId" = o.id
INNER JOIN "Goals" g ON o."goalId" = g.id
WHERE ARRAY_TO_STRING(ar."topics", ',')`;

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
