import { activityReportsFiltersToScopes as activityReport } from './activityReport';
import { grantsReportFiltersToScopes as grant } from './grants';
import { goalsReportFiltersToScopes as goal } from './goals';

const modelTypes = {
  activityReport,
  grant,
  goal,
};

export default function filtersToScopes(filters, model = 'activityReport') {
  return modelTypes[model](filters);
}
