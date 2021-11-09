import { TOPICS, REASONS } from '../constants';

import { countOccurrences } from './helper';

export default async function topicFrequencyGraph(scopes) {
  const topics = await countOccurrences(scopes, 'topics', TOPICS);
  const reasons = await countOccurrences(scopes, 'reason', REASONS);

  return {
    topics,
    reasons,
  };
}
