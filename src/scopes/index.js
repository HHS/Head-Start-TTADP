import { activityReportsFiltersToScopes as activityReport } from './activityReport';
import { grantsReportFiltersToScopes as grant } from './grants';
import { goalsReportFiltersToScopes as goals } from './goals';

const modelTypes = {
  activityReport,
  grant,
  goals,
};

export default function filtersToScopes(filters, model = 'activityReport') {
  return modelTypes[model](filters);
}
