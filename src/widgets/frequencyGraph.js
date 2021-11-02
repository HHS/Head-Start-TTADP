import { Op } from 'sequelize';
import {
  ActivityReport,
  sequelize,
} from '../models';
import { REPORT_STATUSES, TOPICS, REASONS } from '../constants';

async function countOccurrences(scopes, column, possibilities) {
  const allOccurrences = await ActivityReport.findAll({
    attributes: [
      [sequelize.fn('unnest', sequelize.col(column)), column],
    ],
    where: {
      [Op.and]: [scopes],
      calculatedStatus: REPORT_STATUSES.APPROVED,
    },
    nest: true,
    raw: true,
  });

  const result = possibilities.reduce((prev, current) => ({
    ...prev,
    [current]: 0,
  }), {});

  allOccurrences.forEach((row) => {
    const occurrence = row[column];
    if (occurrence in result) {
      result[occurrence] += 1;
    } else {
      result[occurrence] = 1;
    }
  });

  return Object.entries(result).map(([key, value]) => ({
    category: key,
    count: value,
  }));
}

export default async function topicFrequencyGraph(scopes) {
  const topic = await countOccurrences(scopes, 'topics', TOPICS);
  const reason = await countOccurrences(scopes, 'reason', REASONS);

  return {
    topic,
    reason,
  };
}
