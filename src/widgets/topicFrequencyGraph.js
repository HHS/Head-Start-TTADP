import { Op } from 'sequelize';
import {
  ActivityReport,
  Approval,
} from '../models';
import { REPORT_STATUSES, TOPICS } from '../constants';

export default async function topicFrequencyGraph(scopes) {
  const topicsAndParticipants = await ActivityReport.findAll({
    attributes: [
      'topics',
    ],
    where: {
      [Op.and]: [
        scopes.activityReport,
        { '$approval.calculatedStatus$': REPORT_STATUSES.APPROVED },
      ],
    },
    include: [{
      attributes: ['calculatedStatus'],
      model: Approval,
      as: 'approval',
      required: true,
    }],
    nest: true,
    raw: true,
  });

  const topicsResponse = TOPICS.map((topic) => ({
    topic,
    count: 0,
  }));

  topicsAndParticipants.forEach((topicAndParticipant) => {
    TOPICS.forEach((topic, index) => {
      if (topicAndParticipant.topics.includes(topic)) {
        topicsResponse[index].count += 1;
      }
    });
  });
  return topicsResponse;
}
