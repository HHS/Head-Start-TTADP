import db from '../../models';
import { RemappingDefinition, includeToFindAll, remap } from '../../lib/modelUtils';

const {
  GoalTemplateResource,
  Resource,
} = db;

// TODO: finish
const syncGoalTemplateResources = async () => {};

const includeGoalTemplateResources = () => ({
  model: GoalTemplateResource,
  as: 'goalTemplateResources',
  required: false,
  attributes: [
    'id',
    'resourceId',
    'sourceFields',
    'isFoiaable',
    'isReferenced',
  ],
  include: [{
    model: Resource,
    as: 'resource',
    required: true,
    attributes: [
      'id',
      'domain',
      'url',
      'title',
      'metadata',
    ],
  }],
});

const getGoalTemplateResources = async (
  goalTemplateId: number,
) => includeToFindAll(
  includeGoalTemplateResources,
  {
    goalTemplateId,
  },
);

export {
  syncGoalTemplateResources,
  includeGoalTemplateResources,
  getGoalTemplateResources,
};
