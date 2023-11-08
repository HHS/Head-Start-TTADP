/**
 * @async
 * @param {number} recipient_id - The ID of the recipient.
 * @param {boolean} [cluster] - Specifies whether to cluster the results. Default value is false.
 * @returns {Promise<Array>} A promise that resolves to an array of similar goals.
 */
// eslint-disable-next-line import/prefer-default-export
export async function similarGoalsForRecipient(recipient_id, cluster) {
  /**
    * response without clustering looks like:
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
  try {
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
    return response.json();
  } catch (error) {
    throw new Error(error);
  }
}
