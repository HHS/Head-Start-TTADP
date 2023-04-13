/* eslint-disable max-len */
/* eslint-disable import/prefer-default-export */
import { Op, QueryTypes } from 'sequelize';
import {
  ActivityReport,
  ActivityReportObjective,
  Goal,
  Objective,
  Topic,
  sequelize,
} from '../models';
import { REPORT_STATUSES } from '../constants';

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
            SELECT ARRAY_REMOVE(ARRAY_AGG(x.topic), null)
            FROM (
              SELECT ar.topic
              FROM UNNEST(COALESCE("ActivityReport"."topics",array[]::varchar[])) ar(topic)
              UNION ALL
              SELECT aro.topic
              FROM UNNEST(ARRAY_AGG("activityReportObjectives->topics".name)) aro(topic)
            ) x(topic)
            GROUP BY TRUE
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
    sequelize.query(`
    SELECT
      DISTINCT
      TT."name",
      COALESCE(TT2."name", TT."name") AS final_name
    FROM "Topics" TT
    LEFT JOIN "Topics" TT2 ON TT."mapsTo" = TT2.ID
    WHERE TT."deletedAt" IS NULL OR TT."mapsTo" IS NOT NULL
    ORDER BY TT."name"
    `, { type: QueryTypes.SELECT }),
    Topic.findAll({
      attributes: ['id', 'name', 'deletedAt'],
      order: [['name', 'ASC']],
    }),
  ]);

  const lookUpTopic = new Map(topicMappings.map((i) => [i.name, i.final_name]));

  // Get all DB topics.
  const topicsResponse = dbTopics.map((topic) => ({
    topic: topic.name,
    count: 0,
  }));

  return topicsAndParticipants.reduce((acc, report) => {
    // Get array of all topics from this reports and this reports objectives.
    const allTopics = report.topics.map((t) => lookUpTopic.get(t));

    // Loop all topics array and update totals.
    allTopics.forEach((topic) => {
      const topicIndex = acc.findIndex((t) => t.topic === topic);
      if (topicIndex !== -1) {
        acc[topicIndex].count += 1;
      }
    });

    return acc;
  }, topicsResponse);
}

export async function topicFrequencyGraphViaGoals(scopes) {
  const [
    topicsAndParticipants,
    topicMappings,
    dbTopics,
  ] = await Promise.all([
    Goal.findAll({
      attributes: [
        [
          sequelize.literal(`(
            SELECT ARRAY_REMOVE(ARRAY_AGG(DISTINCT x.topic ORDER BY x.topic), null)
            FROM (
              SELECT ar.topic
              FROM UNNEST(ARRAY_AGG("objectives->activityReportObjectives->activityReport".id)) ars(id)
              JOIN "ActivityReports" art
              ON ars.id = art.id
              CROSS JOIN UNNEST(COALESCE("art"."topics",array[]::varchar[])) ar(topic)
              UNION ALL
              SELECT aro.topic
              FROM UNNEST(ARRAY_AGG("objectives->activityReportObjectives->topics".name)) aro(topic)
            ) x(topic)
            GROUP BY TRUE
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
    sequelize.query(`
    SELECT
      DISTINCT
      TT."name",
      COALESCE(TT2."name", TT."name") AS final_name
    FROM "Topics" TT
    LEFT JOIN "Topics" TT2 ON TT."mapsTo" = TT2.ID
    WHERE TT."deletedAt" IS NULL OR TT."mapsTo" IS NOT NULL
    ORDER BY TT."name"
    `, { type: QueryTypes.SELECT }),
    Topic.findAll({
      attributes: ['id', 'name', 'deletedAt'],
      order: [['name', 'ASC']],
    }),
  ]);

  const lookUpTopic = new Map(topicMappings.map((i) => [i.name, i.final_name]));

  // Get all DB topics.
  const topicsResponse = dbTopics.map((topic) => ({
    topic: topic.name,
    count: 0,
  }));

  return topicsAndParticipants.reduce((acc, goal) => {
    // Get array of all topics from this goal's objectives and the reports the objectives
    // where use on.
    const allTopics = goal.get('topics').map((t) => lookUpTopic.get(t));

    // Loop all topics array and update totals.
    allTopics.forEach((topic) => {
      const topicIndex = acc.findIndex((t) => t.topic === topic);
      if (topicIndex !== -1) {
        acc[topicIndex].count += 1;
      }
    });

    return acc;
  }, topicsResponse);
}
