import db from '../../models';
import { RemappingDefinition, includeToFindAll, remap } from '../../lib/modelUtils';

const {
  GoalTemplateFieldPrompt,
} = db;

// TODO: finish
const syncGoalTemplateFieldPrompts = async () => {};

const includeGoalTemplateFieldPrompts = () => ({
  model: GoalTemplateFieldPrompt,
  as: 'goalTemplateFieldPrompts',
  required: false,
  attributes: [
    'id',
    'caution',
    'hint',
    'ordinal',
    'title',
    'prompt',
    'fieldType',
    'options',
    'validations',
    'isFoiaable',
    'isReferenced',
  ],
});

const getGoalTemplateFieldPrompts = async (
  goalTemplateId: number,
) => includeToFindAll(
  includeGoalTemplateFieldPrompts,
  {
    goalTemplateId,
  },
);

export {
  syncGoalTemplateFieldPrompts,
  includeGoalTemplateFieldPrompts,
  getGoalTemplateFieldPrompts,
};
