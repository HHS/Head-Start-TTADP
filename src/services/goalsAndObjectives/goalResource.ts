import db from '../../models';
import { RemappingDefinition, includeToFindAll, remap } from '../../lib/modelUtils';

const {
  GoalResource,
  Resource,
} = db;

// TODO: finish
const syncGoalResources = async (data) => {
  // TODO: call current implementation if posable
  processGoalForResourcesById();
};

const includeGoalResources = () => ({
  model: GoalResource,
  as: 'goalResources',
  required: false,
  attributes: [
    'id',
    'resourceId',
    'sourceFields',
    'isFoiaable',
    'isReferenced',
  ],
  includes: [{
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

const getGoalResources = async (
  goalId: number,
) => includeToFindAll(
  includeGoalResources,
  {
    goalId,
  },
);

export {
  syncGoalResources,
  includeGoalResources,
  getGoalResources,
};
