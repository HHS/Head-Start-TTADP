import { Op, QueryTypes } from 'sequelize';
import {
  sequelize,
  ActivityReport,
  Goal,
  Topic,
  Objective,
  ActivityReportObjective,
} from '../models';
import { REASONS, REPORT_STATUSES } from '../constants';
import { countOccurrences } from './helpers';
// import { topicFrequencyGraphViaGoals } from './topicFrequencyGraph';

export default async function frequencyGraph(scopes) {
  const [
    topicsViaGoals,
    topicMappings,
    dbTopics,
  ] = await Promise.all([Goal.findAll({
    attributes: ['id'],
    where: {
      [Op.and]: [scopes.goal],
    },
    include: [
      {
        model: ActivityReport,
        as: 'activityReports',
        where: {
          calculatedStatus: REPORT_STATUSES.APPROVED,
        },
      },
      {
        model: Objective,
        as: 'objectives',

        include: [
          {
            model: ActivityReportObjective,
            as: 'activityReportObjectives',

            include: [{
              model: Topic,
              as: 'topics',
            }],
          },
        ],
      },
    ],
  }),
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
  })]);

  const lookUpTopic = new Map(topicMappings.map((i) => [i.name, i.final_name]));
  const topicsFromReports = await countOccurrences(scopes.activityReport, 'topics', dbTopics.map((t) => t.name));
  const reasons = await countOccurrences(scopes.activityReport, 'reason', REASONS);

  const topics = topicsViaGoals.reduce((acc, goal) => {
    // Get array of all topics from this goal's objectives and the reports the objectives
    // where use on.
    const allTopics = goal.objectives
      .flatMap((o) => o.activityReportObjectives
        .flatMap((aro) => aro.topics.map((t) => lookUpTopic.get(t.name))));

    // Loop all topics array and update totals.
    allTopics.forEach((topic) => {
      const topicIndex = acc.findIndex((t) => t.category === topic);
      if (topicIndex !== -1) {
        acc[topicIndex].count += 1;
      }
    });

    return acc;
  }, topicsFromReports);

  return {
    topics,
    reasons,
  };
}
