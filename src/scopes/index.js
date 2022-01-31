import { activityReportsFiltersToScopes as activityReport } from './activityReport';
import { grantsFiltersToScopes as grant } from './grants';
import { goalsFiltersToScopes as goal } from './goals';

const models = {
  activityReport,
  grant,
  goal,
};

/**
 * For each model listed, we apply the passed in filters from the express query and
 * combine them to produce an object that contains applicable scopes for all models
 *
 * an object roughly like this
 * {
 *   activityReport: SEQUELIZE OP,
 *   grant: SEQUELIZE OP,
 *   recipient: SEQUELIZE OP,
 * }
 *
 * @param {} filters
 * @returns {obj} scopes
 */
export default function filtersToScopes(filters) {
  return Object.keys(models).reduce((scopes, model) => {
    // we make em an object like so
    Object.assign(scopes, { [model]: models[model](filters) });
    return scopes;
  }, {});
}
