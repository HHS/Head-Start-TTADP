import { similarGoalsForRecipient } from '../services/similarity';

/**
 * Figures out how strict we want our match to be based
 * on the number of words in the text
 *
 * @param numberOfWords
 * @returns a float between 0.5 and 0.9
 */
export function determineSimilarityAlpha(numberOfWords: number) {
  return Math.min(
    0.9,
    Math.max(0.5, numberOfWords / 10),
  );
}

export default async function nudge(
  recipientId: number,
  text: string,
) {
  // guess at number of words
  const numberOfWordsInText = text.split(' ').length;
  // get the similarity alpha
  const alpha = determineSimilarityAlpha(numberOfWordsInText);
  // query the NLP service for similar goals
  const similarGoals = await similarGoalsForRecipient(
    recipientId,
    false, // no clustering
    {
      alpha, // similarity alpha
    },
  );

  //
  //   TODO: we need to query Sequelize here (or alter the NLP service) to satisfy the following:
  //
  // - if multiple grant numbers are selected, the matched goals need to have all grants and
  //   those grants need to have the same status on the goal
  //
  // - Making OHS initiatives always available for goal creation. Curated goals already prevent
  //   duplicates from being created. You can only have one open FEI or monitoring goal at a time,
  //   but you can have many closed FEI and monitoring goals
  //

  return similarGoals;
}
