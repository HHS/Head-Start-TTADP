import { Op } from 'sequelize';
import { sequelize } from '../../models';

const topicFilter = (topics, options) => {
  const useRecipient = options && options.recipientId;
  return `(
          SELECT DISTINCT "Goal".id FROM "ActivityReports" ar 
            INNER JOIN "ActivityReportGoals" arg ON ar.id = arg."activityReportId" 
            INNER JOIN "Goals" "Goal" ON arg."goalId" = "Goal".id 
            INNER JOIN "Grants" gr ON "Goal"."grantId" = gr."id" 
            WHERE ${useRecipient ? `gr."recipientId" = ${sequelize.escape(options.recipientId)} AND ` : ''} 
            ar."topics" && (ARRAY[${topics.map((t) => sequelize.escape(t)).join(',')}::varchar])
          UNION ALL
          SELECT DISTINCT "Goal"."id" FROM "Objectives" "Objectives" 
            INNER JOIN "ObjectiveTopics" "ObjectiveTopics" ON "Objectives"."id" = "ObjectiveTopics"."objectiveId" 
            INNER JOIN "Topics" "Topics" ON "ObjectiveTopics"."topicId" = "Topics"."id" 
            INNER JOIN "Goals" "Goal" ON "Objectives"."goalId" = "Goal"."id" 
            WHERE "Topics"."name" IN (${topics.map((t) => sequelize.escape(t)).join(',')})
        )`;
};

export function withTopics(topics, options) {
  return {
    id: {
      [Op.in]: sequelize.literal(topicFilter(topics, options)),
    },
  };
}

export function withoutTopics(topics, options) {
  return {
    id: {
      [Op.notIn]: sequelize.literal(topicFilter(topics, options)),
    },
  };
}
