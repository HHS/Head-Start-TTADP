import { topicFrequencyGraphViaGoals } from './topicFrequencyGraph';

export default async function frequencyGraph(scopes) {
  const topicsViaGoals = await topicFrequencyGraphViaGoals(scopes);

  return {
    topics: topicsViaGoals.map((t) => ({ category: t.topic, count: t.count })),
  };
}
