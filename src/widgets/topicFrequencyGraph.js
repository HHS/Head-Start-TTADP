import { Op, QueryTypes } from 'sequelize';
import {
  ActivityReport,
  Topic,
  ActivityReportObjective,
  sequelize,
} from '../models';
import { REPORT_STATUSES } from '../constants';

export default async function topicFrequencyGraph(scopes) {
  // console.time('overallTime2');

  // Get reports for scopes.
  const reportsToInclude = await ActivityReport.findAll({
    attributes: ['id'],
    raw: true,
    where: {
      [Op.and]: [scopes.activityReport],
      calculatedStatus: REPORT_STATUSES.APPROVED,
    },
  });

  // Get report ids for where.
  const reportIds = reportsToInclude.map((r) => r.id);
  const topicsAndParticipants = await sequelize.query(`
    SELECT
    ar."id",
    MAX(ar."topics") as "topics",
    array_agg(t."name") as "obj_topics"
  FROM "ActivityReports" ar
  LEFT JOIN "ActivityReportObjectives" aro
    ON ar."id" = aro."activityReportId"
  LEFT JOIN "ActivityReportObjectiveTopics" art
    ON aro."id" = art."activityReportObjectiveId"
  LEFT JOIN "Topics" t
    ON art."topicId" = t.id
  WHERE ar."id" IN (${reportIds.join(',')})
  GROUP BY ar."id"
  `, {
    type: QueryTypes.SELECT,
  });

  // Get mappings.
  const topicMappings = await sequelize.query(`
  SELECT
    DISTINCT
    TT."name",
    COALESCE(TT2."name", TT."name") AS final_name
  FROM "Topics" TT
  LEFT JOIN "Topics" TT2 ON TT."mapsTo" = TT2.ID
  WHERE TT."deletedAt" IS NULL OR TT."mapsTo" IS NOT NULL
  ORDER BY TT."name"
  `, { type: QueryTypes.SELECT });

  const lookUpTopic = new Map(topicMappings.map((i) => [i.name, i.final_name]));

  // Get all DB topics.
  const dbTopics = await Topic.findAll({
    attributes: ['id', 'name', 'deletedAt'],
    order: [['name', 'ASC']],
  });
  const topics = dbTopics.map((t) => t.name);
  const topicsResponse = topics.map((topic) => ({
    topic,
    count: 0,
  }));

  const toReturn = topicsAndParticipants.reduce((acc, report) => {
    // Get array of all topics from this reports and this reports objectives.
    const allTopics = [
      ...report.topics.map((t) => lookUpTopic.get(t)),
      ...report.obj_topics.filter((o) => o),
    ];

    // Loop all topics array and update totals.
    allTopics.forEach((topic) => {
      const topicIndex = acc.findIndex((t) => t.topic === topic);
      if (topicIndex !== -1) {
        acc[topicIndex].count += 1;
      }
    });

    return acc;
  }, topicsResponse);

  // console.timeEnd('overallTime2');
  return toReturn;
}
