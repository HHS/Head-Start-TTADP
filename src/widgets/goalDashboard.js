import { goalDashboard } from '../services/dashboards/goal';

export default async function goalDashboardWidget(scopes) {
  return goalDashboard(scopes);
}
