import { activityReportsFiltersToScopes as activityReport } from './activityReport';
import { grantsFiltersToScopes as grant } from './grants';
import { recipientFiltersToScopes as recipient } from './recipient';

const modelTypes = [
  activityReport,
  grant,
  recipient,
];

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
  // we take the model types
  return modelTypes.reduce((scopes, model) => {
    // we make em an object like so
    Object.assign(scopes, { [model]: model(filters) });
    return scopes;
  }, {});
}
