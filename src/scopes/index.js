import { filtersToScopes } from './activityReport';
import { granteeReportFiltersToScopes } from './grantees';

// eslint-disable-next-line import/prefer-default-export
export function determineFiltersToScopes(widgetType, filters) {
  // Convert the query to scopes.
  if (widgetType === 'grantee') {
    // Grantee.
    return granteeReportFiltersToScopes(filters);
  }

  // Activity Report.
  return filtersToScopes(filters);
}
