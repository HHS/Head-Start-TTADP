/* eslint-disable import/prefer-default-export */
/**
 * @async
 * @param {number} recipient_id - The ID of the recipient.
 * @param {boolean} [cluster] - Specifies whether to cluster the results. Default value is false.
 * @returns {Promise<Array>} A promise that resolves to an array of similar goals.
 */
import { auditLogger } from '../logger';

const namespace = 'SERVICE:SIMILARITY';

async function postToSimilarity(body) {
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
        body: JSON.stringify(body),
      },
    );

    // Check if response is OK before parsing JSON
    if (!response.ok) {
      const errorText = await response.text();
      auditLogger.error(`${namespace} Similarity API error response: ${errorText.substring(0, 500)}`);
      throw new Error(`API returned status ${response.status}: ${errorText.substring(0, 100)}`);
    }

    return await response.json();
  } catch (error) {
    auditLogger.error(
      `${namespace} Similarity API response failure: ${error.message}`,
      { error },
    );
    throw error;
  }
}

export async function similarGoalsForRecipient(
  recipient_id,
  cluster,
  refinements = { alpha: 0.9 },
) {
  return postToSimilarity({
    recipient_id,
    cluster,
    ...refinements,
  });
}
