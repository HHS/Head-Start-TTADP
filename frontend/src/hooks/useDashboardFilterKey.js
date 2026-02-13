import { useMemo } from 'react'

const FILTER_KEY = (dashboardName, reportType) => `${dashboardName}-filters-${reportType}`

export default function useDashboardFilterKey(dashboardName, reportType = '') {
  const filterKey = useMemo(() => FILTER_KEY(dashboardName, reportType), [dashboardName, reportType])
  return filterKey
}
