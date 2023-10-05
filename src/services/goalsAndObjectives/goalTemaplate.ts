// TODO: everything
import { Op } from 'sequelize';
import db from '../../models';
import { GOAL_STATUS } from '../../constants';
import { RemappingDefinition, includeToFindAll, remap } from '../../lib/modelUtils';
import { includeGoalTemplateFieldPrompts } from './goalTemplateFieldPrompt';
import { includeGoalTemplateResources } from './goalTemplateResource';
import { syncGoals } from './goal';

const {
  GoalTemplate,
  Grant,
} = db;

// TODO: finish
const syncGoalTemplates = async (
  regionId,
  creationMethod,
  data,
) => {

};

const includeGoalTemplates = () => ({
  model: GoalTemplate,
  as: 'goalTemplates',
  required: false,
  attributes: [
    'id',
    'templateName',
    'regionId',
    'creationMethod',
    'isFoiaable',
    'isReferenced',
  ],
  includes: [
    includeGoalTemplateFieldPrompts(),
    includeGoalTemplateResources(),
  ],
});

// TODO: we need any additional filters or scopes?
const getGoalTemplates = async (
  goalTemplateIds?: number[],
): Promise<object[]> => includeToFindAll(
  includeGoalTemplates,
  {
    ...(goalTemplateIds && goalTemplateIds.length > 0 && { id: goalTemplateIds }),
  },
);

const distributeGoalFromGoalTemplate = async (
  goalTemplateId: number,
  recipientGrants: { recipeintId: number, grantId: number }[],
) => {
  /**  TODO:
  * 1: in parallel
  *   Locate GoalTemplate
  *   check that each of the grants is active
  * 3. call syncGoals for all of the grants that are still still active
  * 4. return a structure
  * {
  *   recipientId,
  *   grantId,
  *   goalId,
  * }[]  */
  const [
    goalTemplate,
    activeGrants,
  ] = await Promise.all([
    getGoalTemplates([goalTemplateId]),
    Grant.findAll({
      atttributes: [
        ['id'],
      ],
      where: {
        [Op.or]: recipientGrants.map(({ recipeintId, grantId }) => ({
          id: grantId,
          recipeintId,
        })),
        status: 'Active', // TODO: need to verify, how is this not an enum/constant anywhere
      },
      raw: true,
    }),
  ]);
  const goalTemplateToGoalRemapDef = {
    id: 'goalTemplateId',
    templateName: 'name',
  };
  const { mapped, unmapped } = remap(
    goalTemplate,
    goalTemplateToGoalRemapDef,
    { keepUnmappedValues: true },
  );
  return Promise.all(
    activeGrants.map((async ({ id: grantId }) => syncGoals(
      grantId,
      mapped,
    ))),
  );
};

export {
  syncGoalTemplates,
  includeGoalTemplates,
  getGoalTemplates,
  distributeGoalFromGoalTemplate,
};
