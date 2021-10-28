import { activityReportsFiltersToScopes as activityReport } from './activityReport';
import { grantsReportFiltersToScopes as grant } from './grants';

const modelTypes = {
  activityReport,
  grant,
};

export default function filtersToScopes(filters, model = 'activityReport') {
  return modelTypes[model](filters);
}
