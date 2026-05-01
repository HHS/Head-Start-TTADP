import { goalDashboardGoals } from '../services/dashboards/goal';

export default async function goalDashboardGoalsWidget(scopes, query) {
  return goalDashboardGoals(scopes, query);
}
