import { REASONS } from '@ttahub/common';
import { countOccurrences } from './helpers';
import { topicFrequencyGraphViaGoals } from './topicFrequencyGraph';

export default async function frequencyGraph(scopes) {
  const reasons = await countOccurrences(scopes.activityReport, 'reason', REASONS);
  const topicsViaGoals = await topicFrequencyGraphViaGoals(scopes);

  return {
    topics: topicsViaGoals.map((t) => ({ category: t.topic, count: t.count })),
    reasons,
  };
}
