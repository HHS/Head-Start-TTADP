import { Op } from 'sequelize'
import { sequelize } from '../../models'

const topicFilter = (topics, options, _userId, validTopics = new Set()) => {
  const useRecipient = options?.recipientId
  const safeTopics = (topics || []).filter((t) => validTopics.has(t))
  if (safeTopics.length === 0) return 'SELECT NULL WHERE false'

  const escapedTopics = safeTopics.map((t) => sequelize.escape(t)).join(',')

  return `(
    SELECT DISTINCT "Goal".id FROM "ActivityReports" ar 
      INNER JOIN "ActivityReportGoals" arg ON ar.id = arg."activityReportId" 
      INNER JOIN "Goals" "Goal" ON arg."goalId" = "Goal".id 
      INNER JOIN "Grants" gr ON "Goal"."grantId" = gr."id" 
      WHERE ${useRecipient ? `gr."recipientId" = ${sequelize.escape(useRecipient)} AND ` : ''} 
      ar."topics" && (ARRAY[${escapedTopics}::varchar])
    UNION ALL
    SELECT DISTINCT "Goal"."id" FROM "Objectives" "Objectives" 
      INNER JOIN "ActivityReportObjectives" "ActivityReportObjectives" ON "Objectives"."id" = "ActivityReportObjectives"."objectiveId" 
      INNER JOIN "ActivityReportObjectiveTopics" "ActivityReportObjectiveTopics" ON "ActivityReportObjectives"."id" = "ActivityReportObjectiveTopics"."activityReportObjectiveId" 
      INNER JOIN "Topics" "Topics" ON "ActivityReportObjectiveTopics"."topicId" = "Topics"."id" 
      INNER JOIN "Goals" "Goal" ON "Objectives"."goalId" = "Goal"."id" 
      WHERE "Topics"."name" IN (${escapedTopics})
  )`
}

export function withTopics(topics, options, _userId, validTopics = new Set()) {
  return {
    id: {
      [Op.in]: sequelize.literal(topicFilter(topics, options, _userId, validTopics)),
    },
  }
}

export function withoutTopics(topics, options, _userId, validTopics = new Set()) {
  return {
    id: {
      [Op.notIn]: sequelize.literal(topicFilter(topics, options, _userId, validTopics)),
    },
  }
}
