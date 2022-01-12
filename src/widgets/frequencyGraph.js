import { TOPICS, REASONS } from '../constants';

import { countOccurrences } from './helper';

export default async function topicFrequencyGraph(scopes) {
  const topics = await countOccurrences(scopes.activityReport, 'topics', TOPICS);
  const reasons = await countOccurrences(scopes.activityReport, 'reason', REASONS);

  return {
    topics,
    reasons,
  };
}
