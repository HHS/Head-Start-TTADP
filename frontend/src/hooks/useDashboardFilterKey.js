import { useMemo } from 'react';

const DASHBOARD_CACHE_NUMBER = 1; // Increment this to reset all dashboard filters in session storage
const FILTER_KEY = (dashboardName, reportType) =>
  `${dashboardName}-filters-${reportType}-${DASHBOARD_CACHE_NUMBER}`;

export default function useDashboardFilterKey(dashboardName, reportType = '') {
  const filterKey = useMemo(
    () => FILTER_KEY(dashboardName, reportType),
    [dashboardName, reportType]
  );
  return filterKey;
}
