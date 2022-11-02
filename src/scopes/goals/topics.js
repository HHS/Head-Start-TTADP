import { Op } from 'sequelize';
import { filterAssociation } from './utils';
import { sequelize } from '../../models';

const objectiveTopicFilter = `
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

const reportTopicFilter = (options) => {
  const useRecipient = options && options.recipientId;
  return `
          SELECT DISTINCT g.id
          FROM "ActivityReports" ar
          INNER JOIN "ActivityReportGoals" arg ON ar.id = arg."activityReportId"
          INNER JOIN "Goals" g ON arg."goalId" = g.id
          INNER JOIN "Grants" gr ON g."grantId" = gr."id"
          WHERE ${useRecipient ? `gr."recipientId" = ${sequelize.escape(options.recipientId)} AND ` : ''}
          ARRAY_TO_STRING(ar."topics", ',')`;
};

export function withTopics(topics, options) {
  return {
    [Op.or]: [
      filterAssociation(
        reportTopicFilter(options),
        topics,
        false,
        'ILIKE',
      ),
      filterAssociation(
        objectiveTopicFilter,
        topics,
        false,
        'ILIKE',
      ),
    ],
  };
}

export function withoutTopics(topics, options) {
  return {
    [Op.and]: [
      filterAssociation(
        reportTopicFilter(options),
        topics,
        true,
        'ILIKE',
      ),
      filterAssociation(
        objectiveTopicFilter,
        topics,
        true,
        'ILIKE',
      ),
    ],
  };
}
