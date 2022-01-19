import { Op } from 'sequelize';
import { filterAssociation } from './utils';

const topicFilter = `
SELECT "Objectives"."goalId" FROM "ActivityReportObjectives" 
INNER JOIN "Objectives" on "ActivityReportObjectives"."objectiveId" = "Objectives"."id" 
INNER JOIN "ActivityReports" ON "ActivityReportObjectives"."activityReportId" = "ActivityReports"."id"
WHERE ARRAY_TO_STRING("ActivityReports"."topics", ',')`; // ~* var topics

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
