import { Op, QueryTypes } from 'sequelize';
import { REPORT_STATUSES } from '@ttahub/common';
import { uniq } from 'lodash';
import {
  ActivityReport,
  ActivityReportObjective,
  Goal,
  Objective,
  Topic,
  sequelize,
} from '../models';
import { scopeToWhere } from '../scopes/utils';
import { getAllTopicsForWidget as getAllTopics } from './helpers';

const getTopicMappings = async () => sequelize.query(`
SELECT
  DISTINCT
  TT."name",
  COALESCE(TT2."name", TT."name") AS final_name
FROM "Topics" TT
LEFT JOIN "Topics" TT2 ON TT."mapsTo" = TT2.ID
WHERE TT."deletedAt" IS NULL OR TT."mapsTo" IS NOT NULL
ORDER BY TT."name"
`, { type: QueryTypes.SELECT });

export async function topicFrequencyGraph(scopes) {
  const [
    topicsAndParticipants,
    topicMappings,
    dbTopics,
  ] = await Promise.all([
    ActivityReport.findAll({
      attributes: [
        [
          sequelize.literal(`(
            SELECT ARRAY_REMOVE(ARRAY_AGG(DISTINCT x.topic), null)
            FROM (
              SELECT ar.topic
              FROM UNNEST(COALESCE("ActivityReport"."topics",array[]::varchar[])) ar(topic)
              UNION ALL
              SELECT aro.topic
              FROM UNNEST(ARRAY_AGG("activityReportObjectives->topics".name)) aro(topic)
            ) x(topic)
            GROUP BY 1=1
          )`),
          'topics',
        ],
      ],
      group: ['"ActivityReport".id'],
      where: {
        [Op.and]: [scopes.activityReport],
        calculatedStatus: REPORT_STATUSES.APPROVED,
      },
      include: [{
        attributes: [],
        model: ActivityReportObjective,
        as: 'activityReportObjectives',
        required: false,
        include: [
          {
            attributes: [],
            model: Topic,
            as: 'topics',
            through: {
              attributes: [],
            },
          },
        ],
      }],
    }),
    // Get mappings.
    getTopicMappings(),
    getAllTopics(),
  ]);

  const lookUpTopic = new Map(topicMappings.map((i) => [i.name, i.final_name]));

  // Get all DB topics.
  const topicsResponse = dbTopics.map((topic) => ({
    topic: topic.name,
    count: 0,
  }));

  return topicsAndParticipants.reduce((acc, report) => {
    // Get array of all topics from this reports and this reports objectives.
    const allTopics = uniq(report.topics).map((t) => lookUpTopic.get(t));

    // Loop all topics array and update totals.
    allTopics?.forEach((topic) => {
      const topicIndex = acc.findIndex((t) => t.topic === topic);
      if (topicIndex !== -1) {
        acc[topicIndex].count += 1;
      }
    });

    return acc;
  }, topicsResponse);
}

export async function topicFrequencyGraphViaGoals(scopes) {
  const activityReportWhere = await scopeToWhere(ActivityReport, 'art', scopes.activityReport);

  const [
    topicsAndParticipants,
    topicMappings,
    dbTopics,
  ] = await Promise.all([
    Goal.findAll({
      attributes: [
        [
          sequelize.literal(`(
            WITH
              "all_topics_with_reports" AS (
                SELECT
                  ar.topic,
                  ars.id "activityReportId"
                FROM UNNEST(ARRAY_AGG("objectives->activityReportObjectives->activityReport".id)) ars(id)
                JOIN "ActivityReports" art
                ON ars.id = art.id
                CROSS JOIN UNNEST(COALESCE("art"."topics",array[]::varchar[])) ar(topic)
                WHERE ${activityReportWhere}
                UNION ALL
                SELECT
                  t.name topic,
                  aro."activityReportId" "activityReportId"
                FROM UNNEST(ARRAY_AGG("objectives->activityReportObjectives".id)) aros(id)
                JOIN "ActivityReportObjectives" aro
                ON aros.id = aro.id
                JOIN "ActivityReportObjectiveTopics" arot
                ON aro.id = arot."activityReportObjectiveId"
                JOIN "Topics" t
                ON arot."topicId" = t.id
                JOIN "ActivityReports" art
                ON aro."activityReportId" = art.id
                WHERE ${activityReportWhere}
              ),
              "all_topics_with_report_array" AS (
                SELECT
                  topic,
                  ARRAY_AGG(DISTINCT "activityReportId") "reportIds"
                FROM all_topics_with_reports atwr
                GROUP BY topic
              )
            SELECT ARRAY_REMOVE(ARRAY_AGG(DISTINCT jsonb_build_object(
              'topic', x.topic,
              'reportIds', x."reportIds"
            )), null)
            FROM "all_topics_with_report_array" x(topic, "reportIds")
            GROUP BY 1=1
          )`),
          'topics',
        ],
      ],
      group: [
        '"Goal".id',
      ],
      where: {
        [Op.and]: [scopes.goal],
      },
      include: [
        {
          attributes: [],
          model: Objective,
          as: 'objectives',
          required: true,
          include: [{
            attributes: [],
            model: ActivityReportObjective,
            as: 'activityReportObjectives',
            required: true,
            include: [
              {
                attributes: [],
                model: Topic,
                as: 'topics',
                through: {
                  attributes: [],
                },
              },
              {
                attributes: [],
                model: ActivityReport,
                as: 'activityReport',
                required: true,
                where: { calculatedStatus: REPORT_STATUSES.APPROVED },
              },
            ],
          }],
        },
      ],
    }),
    // Get mappings.
    getTopicMappings(),
    getAllTopics(),
  ]);

  const lookUpTopic = new Map(topicMappings.map((i) => [i.name, i.final_name]));

  // Get all DB topics.
  const topicsResponse = dbTopics.map((topic) => ({
    topic: topic.name,
    reportIds: new Set(),
  }));

  topicsAndParticipants?.forEach((goalData) => {
    goalData
      .get('topics')?.forEach(({ topic, reportIds }) => {
        const topicResponse = topicsResponse
          .find((t) => t.topic === lookUpTopic.get(topic));

        if (!topicResponse) return;
        reportIds?.forEach((id) => topicResponse.reportIds.add(id));
      });
  });

  return topicsResponse
    .map(({ topic, reportIds }) => ({ topic, count: reportIds.size }));
}
