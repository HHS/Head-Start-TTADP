import { TOPICS, REASONS } from '@ttahub/common';

import { countOccurrences } from './helpers';

export default async function frequencyGraph(scopes) {
  const topics = await countOccurrences(scopes.activityReport, 'topics', TOPICS);
  const reasons = await countOccurrences(scopes.activityReport, 'reason', REASONS);

  return {
    topics,
    reasons,
  };
}
