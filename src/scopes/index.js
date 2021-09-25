import { activityReportsFiltersToScopes as activityReport } from './activityReport';
import { granteeReportFiltersToScopes as grantee } from './grantees';

const widgetTypes = {
  activityReport,
  grantee,
};

export default function determineFiltersToScopes(widgetType = 'activityReport', filters) {
  return widgetTypes[widgetType](filters);
}
