/**
 * @async
 * @param {number} recipient_id - The ID of the recipient.
 * @param {boolean} [cluster] - Specifies whether to cluster the results. Default value is false.
 * @returns {Promise<Array>} A promise that resolves to an array of similar goals.
 */
export default async function getSimilarGoalsForRecipient(recipient_id, cluster) {
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
        cluster,
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
   *      id: 1, name: "Identify strategies", grantId: 1,
   *    },
   *    goal2: {
   *      id: 2, name: "Identify strategies", grantId: 1,
   *    },
   *    similarity: 0.921823748234,
   *  },
   *  {
   *    goal1: {
   *      id: 1, name: "Identify strategies", grantId: 2,
   *    },
   *    goal2: {
   *      id: 2, name: "Identify strategies", grantId: 2,
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
