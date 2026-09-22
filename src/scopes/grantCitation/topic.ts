import { Op } from 'sequelize';
import db from '../../models';

function topicSubQuery(topics: string[]): string {
  const escapedTopics = topics.map((t) => db.sequelize.escape(t)).join(',');
  return `(
    SELECT DISTINCT aroc."citationId"
    FROM "ActivityReportObjectiveCitations" aroc
    JOIN "ActivityReportObjectiveTopics" arot
      ON arot."activityReportObjectiveId" = aroc."activityReportObjectiveId"
    JOIN "Topics" t
      ON t.id = arot."topicId"
    JOIN "ActivityReportObjectives" aro
      ON aro.id = aroc."activityReportObjectiveId"
    JOIN "ActivityReports" ar
      ON ar.id = aro."activityReportId"
      AND ar."calculatedStatus" = 'approved'
    WHERE t.name IN (${escapedTopics})
  )`;
}

export function withTopics(
  topics: string[],
  _options: unknown,
  _userId: number,
  validTopics: Set<string> = new Set()
) {
  const safeTopics = (topics || []).filter((t) => validTopics.has(t));
  if (!safeTopics.length) {
    return { citationId: { [Op.in]: [] } };
  }

  return {
    citationId: {
      [Op.in]: db.sequelize.literal(topicSubQuery(safeTopics)),
    },
  };
}

export function withoutTopics(
  topics: string[],
  _options: unknown,
  _userId: number,
  validTopics: Set<string> = new Set()
) {
  const safeTopics = (topics || []).filter((t) => validTopics.has(t));
  if (!safeTopics.length) {
    return {};
  }

  return {
    citationId: {
      [Op.notIn]: db.sequelize.literal(topicSubQuery(safeTopics)),
    },
  };
}
