import { TOPICS, REASONS } from '../constants';

import { countOccurrences } from './helper';

export default async function topicFrequencyGraph(scopes) {
  const topic = await countOccurrences(scopes, 'topics', TOPICS);
  const reason = await countOccurrences(scopes, 'reason', REASONS);

  return {
    topic,
    reason,
  };
}
