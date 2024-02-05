import { GOAL_STATUS } from '../constants';
import db from '../models';
import { similarGoalsForRecipient } from '../services/similarity';

const { sequelize, Goal, Grant } = db;

interface ISimilarGoal {
  ids: number[];
  name: string;
  status: string;
  goalTemplateId: number;
  endDate: string;
  source: string;
  isCuratedTemplate?: boolean;
}

interface ISimilarResult {
  goal: {
    grantId: number;
    id: number;
    name: string;
    isTemplate: boolean;
  };
  similarity: number;
}

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
  grantNumbers: string[],
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
      include_curated_templates: 1,
    },
  ) as { result: ISimilarResult[] };

  const goalIds = new Set<number>();
  const goalTemplates = [];

  // get the goal ids and template ids
  similarGoals.result.forEach((result) => {
    if (result.goal.isTemplate) {
      goalTemplates.push(result.goal);
    } else {
      goalIds.add(result.goal.id);
    }
  });

  // - if multiple grant numbers are selected, the matched goals need to have all grants and
  //   those grants need to have the same status on the goal

  const goals = (await Goal.findAll({
    attributes: [
      'name',
      'status',
      'goalTemplateId',
      'source',
      'endDate',
      [sequelize.fn('ARRAY_AGG', sequelize.col('Goal.id')), 'ids'],
      [sequelize.literal('FALSE'), 'isCuratedTemplate'],
    ],
    where: {
      id: Array.from(goalIds),
    },
    include: [
      {
        attributes: [],
        as: 'grant',
        model: Grant.unscoped(),
        where: {
          number: grantNumbers,
        },
      },
    ],
    group: [
      '"Goal.source"',
      '"Goal.endDate"',
      '"Goal"."name"',
      '"Goal"."status"',
      '"Goal"."goalTemplateId"',
    ],
    order: [['name', 'ASC']],
  })).map((g: ISimilarGoal & { toJSON: () => ISimilarGoal }) => g.toJSON()) as ISimilarGoal[];

  const templateIds = goals.map((goal) => goal.goalTemplateId);

  // iterate through the goal templates and
  // add any that are not already in the goals
  goalTemplates.forEach((template) => {
    if (!templateIds.includes(template.id)) {
      goals.unshift({
        ids: [template.id],
        name: template.name,
        status: GOAL_STATUS.NOT_STARTED,
        goalTemplateId: template.id,
        isCuratedTemplate: true,
        endDate: '',
        source: template.source,
      });
    }
  });

  return goals;
}
