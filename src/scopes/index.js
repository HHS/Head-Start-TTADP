import { _ } from 'lodash';
import { activityReportsFiltersToScopes as activityReport } from './activityReport';
import { trainingReportsFiltersToScopes as trainingReport } from './trainingReports';
import { communicationLogFiltersToScopes as communicationLog } from './communicationLog';
import { sessionReportFiltersToScopes as sessionReport } from './sessionReports';
import { collabReportFiltersToScopes as collabReport } from './collabReports';
import { grantsFiltersToScopes as grant } from './grants';
import { goalsFiltersToScopes as goal } from './goals';
import { getValidTopicsSet } from './utils';

const models = {
  activityReport,
  grant,
  goal,
  trainingReport,
  communicationLog,
  collabReport,
  sessionReport,
};

/**
 * For each model listed, we apply the passed in filters from the express query and
 * combine them to produce an object that contains applicable scopes for all models
 *
 * an object roughly like this
 * {
 *   activityReport: { where: SEQUELIZE OP, include: SEQUELIZE INCLUDE },
 *   grant: { where: SEQUELIZE OP, include: SEQUELIZE INCLUDE },
 *   recipient: { where: SEQUELIZE OP, include: SEQUELIZE INCLUDE },
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
export default async function filtersToScopes(filters, options = {}) {
  let validTopics;

  const filterKeys = Object.keys(filters || {});
  const usesTopics = filterKeys.some((k) => k.startsWith('topic.'));

  if (usesTopics) {
    validTopics = await getValidTopicsSet();
  }

  return Object.keys(models).reduce((scopes, model) => {
    // we make em an object like so
    Object.assign(scopes, {
      [model]: models[model](filters, options[model], options.userId, validTopics),
    });
    return scopes;
  }, {});
}

/**
 * Merges the provided includes with the required includes, ensuring no duplicates.
 * It is considered duplicate if it has the same value for `as`.
 *
 * @param {Array} includes - The initial array of Sequelize includes.
 * @param {Array} requiredIncludes - The array of required Sequelize includes
 *                                   that must be present.
 * @returns {Array} - The merged array of includes.
 */
export const mergeIncludes = (includes, requiredIncludes) => {
  if (!includes || !includes.length || includes.filter(Boolean).length < 1) {
    return requiredIncludes;
  }

  const outIncludes = [...includes];

  requiredIncludes.forEach((requiredInclude) => {
    if (!outIncludes.some((include) => include.as && include.as === requiredInclude.as)) {
      outIncludes.push(requiredInclude);
    }
  });

  return outIncludes;
};
