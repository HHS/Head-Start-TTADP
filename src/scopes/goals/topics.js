import { Op } from 'sequelize';
import { filterAssociation } from './utils';

const topicFilter = `
SELECT "Objectives"."goalId" FROM "ActivityReportObjectives" 
INNER JOIN "Objectives" on "ActivityReportObjectives"."objectiveId" = "Objectives"."id" 
WHERE "ActivityReportObjectives"."activityReportId" 
IN (SELECT "id" from "ActivityReports" WHERE (ARRAY_TO_STRING(topic, ',')))`;

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
