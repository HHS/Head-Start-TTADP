export default async function getSimilarGoalsForRecipient(recipient_id) {
  const { SIMILARITY_ENDPOINT } = process.env;

  const response = await fetch(
    SIMILARITY_ENDPOINT,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        recipient_id,
        alpha: 0.9,
      }),
    },
  );

  const similarGoals = await response.json();

  /**
   * similarGoals looks like:
   * result: [
   *  {
   *    goal1: {
   *      id: 1, name: "Identify strategies",
   *    },
   *    goal2: {
   *      id: 2, name: "Identify strategies",
   *    },
   *    similarity: 0.921823748234,
   *  },
   *  {
   *    goal1: {
   *      id: 1, name: "Identify strategies",
   *    },
   *    goal2: {
   *      id: 2, name: "Identify strategies",
   *    },
   *    similarity: 0.921823748234,
   *  },
   * ]
   */

  // Create a set of all unique goal IDs from this result.
  const uniqueGoalIds = new Set();
  similarGoals.result.forEach((result) => {
    uniqueGoalIds.add(result.goal1.id);
    uniqueGoalIds.add(result.goal2.id);
  });

  // Return this set as an array to the client.
  return Array.from(uniqueGoalIds);
}
