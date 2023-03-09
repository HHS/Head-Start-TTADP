import { Op } from 'sequelize';
import {
  ActivityReport,
  Topic,
  ActivityReportObjective,
} from '../models';
import { REPORT_STATUSES } from '../constants';

export default async function topicFrequencyGraph(scopes) {
  const topicsAndParticipants = await ActivityReport.findAll({
    attributes: [
      'topics',
    ],
    where: {
      [Op.and]: [scopes.activityReport],
      calculatedStatus: REPORT_STATUSES.APPROVED,
    },
    include: [{
      model: ActivityReportObjective,
      as: 'activityReportObjectives',
      required: false,
      include: [
        {
          model: Topic,
          as: 'topics',
        },
      ],
    }],
  });

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

  return topicsAndParticipants.reduce((acc, report) => {
    // Get array of all topics from this reports and this reports objectives.
    const allTopics = [
      ...report.topics.map((t) => t),
      ...report.activityReportObjectives.flatMap((o) => o.topics.map((t) => t.name)),
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
}
