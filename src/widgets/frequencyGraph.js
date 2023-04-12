import { REASONS } from '../constants';

import { countOccurrences } from './helpers';
import topicFrequencyGraph from './topicFrequencyGraph';

export default async function frequencyGraph(scopes) {
  const topics = await topicFrequencyGraph(scopes);
  const reasons = await countOccurrences(scopes.activityReport, 'reason', REASONS);

  return {
    topics: topics.map((t) => ({ category: t.topic, count: t.count })),
    reasons,
  };
}
