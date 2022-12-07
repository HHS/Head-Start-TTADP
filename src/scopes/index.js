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
 * options is right now only {
 *   model: {
 *      subquery: Boolean
 *   }
 * }
 *
 * but the intent is to build upon it as we need more and more bespoke queries
 *
 * right now the parameter "subset", is used to indicate
 * that the scopes returned should be to produce a total subset based on which model is
 * specified. that feels like a bit of word salad, so hopefully that makes sense.
 *
 * In the current use case for this option, we are sometimes query for activity reports
 * as the main model but in the overview widgets we also need a matching subset of grants
 * so this specifies that the grant query should be returned as a subset based on the activity
 * report filters. I'm not sure about the naming here.
 *
 * @param {} filters
 * @param {} options
 * @returns {obj} scopes
 */
export default function filtersToScopes(filters, options) {
  return Object.keys(models).reduce((scopes, model) => {
    // we make em an object like so
    Object.assign(scopes, {
      [model]: models[model](filters, options && options[model], options && options.userId),
    });
    return scopes;
  }, {});
}
