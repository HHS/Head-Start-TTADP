/**
 * @async
 * @param {number} recipient_id - The ID of the recipient.
 * @param {boolean} [cluster] - Specifies whether to cluster the results. Default value is false.
 * @returns {Promise<Array>} A promise that resolves to an array of similar goals.
 */
import { auditLogger } from '../logger';

const namespace = 'SERVICE:SIMILARITY';

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
    const { SIMILARITY_ENDPOINT, SIMILARITY_API_KEY } = process.env;
    const response = await fetch(
      SIMILARITY_ENDPOINT,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': SIMILARITY_API_KEY,
        },
        body: JSON.stringify({
          recipient_id,
          cluster,
          alpha: 0.9,
        }),
      },
    );
    auditLogger.info(`${namespace} Similarity API response status: ${response.status}, body: ${JSON.stringify(response.body)}`);

    return await response.json();
  } catch (error) {
    auditLogger.error(
      `${namespace} Similarity API response failure: ${error.message}`,
      { error },
    );
    throw new Error(error);
  }
}
