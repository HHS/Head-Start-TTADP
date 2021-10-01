import { activityReportsFiltersToScopes as activityReport } from './activityReport';
import { grantsReportFiltersToScopes as grant } from './grantees';

const widgetTypes = {
  activityReport,
  grant,
};

export default function filtersToScopes(filters, widgetType = 'activityReport') {
  return widgetTypes[widgetType](filters);
}
