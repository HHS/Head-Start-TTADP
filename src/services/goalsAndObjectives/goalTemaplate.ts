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
  // TODO: question? should the code explicitly prevent execution by anything other then the worker?
  /**  TODO:
  * 1: in parallel
  *   Locate GoalTemplate
  *   check that each of the grants is active
  * 3. call syncGoals for all of the grants that are still active
  */
  // TODO: if a recipient grant was active when added to a report but was replaced prior to the
  // report being approved, should the goal be placed on the replacing grant?
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
    goalTemplateResources: 'goalResources',
  };
  const { mapped, unmapped } = remap(
    goalTemplate,
    goalTemplateToGoalRemapDef,
    { keepUnmappedValues: true },
  );

  return syncGoals(activeGrants.map((async ({ id: grantId }) => ({
    grantId,
    ...mapped,
  }))));
};

export {
  syncGoalTemplates,
  includeGoalTemplates,
  getGoalTemplates,
  distributeGoalFromGoalTemplate,
};
