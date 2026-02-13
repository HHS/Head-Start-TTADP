/* eslint-disable no-alert */
/* eslint-disable no-console */
import React, { useContext, useState, useEffect } from 'react'
import moment from 'moment'
import { v4 as uuidv4 } from 'uuid'
import PropTypes from 'prop-types'
import { Helmet } from 'react-helmet'
import { Grid, Alert } from '@trussworks/react-uswds'
import useDeepCompareEffect from 'use-deep-compare-effect'
import useFilters from '../../hooks/useFilters'
import FilterPanel from '../../components/filter/FilterPanel'
import ResourcesDashboardOverview from '../../widgets/ResourcesDashboardOverview'
import ResourceUse from '../../widgets/ResourceUse'
import { showFilterWithMyRegions } from '../regionHelpers'
import { filtersToQueryString, formatDateRange } from '../../utils'
import { fetchFlatResourceData } from '../../fetchers/Resources'
import { downloadReports, getReportsViaIdPost } from '../../fetchers/activityReports'
import { getReportsDownloadURL, getAllReportsDownloadURL } from '../../fetchers/helpers'
import UserContext from '../../UserContext'
import { RESOURCES_DASHBOARD_FILTER_CONFIG } from './constants'
import { REPORTS_PER_PAGE, REGIONAL_RESOURCE_DASHBOARD_FILTER_KEY } from '../../Constants'
import RegionPermissionModal from '../../components/RegionPermissionModal'
import ResourcesAssociatedWithTopics from '../../widgets/ResourcesAssociatedWithTopics'
import ReportsTable from '../../components/ActivityReportsTable/ReportsTable'
import useSessionSort from '../../hooks/useSessionSort'
import './index.scss'

const defaultDate = formatDateRange({
  forDateTime: true,
  string: `2022/07/01-${moment().format('YYYY/MM/DD')}`,
  withSpaces: false,
})

const additionalDefaultFilters = [
  {
    id: uuidv4(),
    topic: 'startDate',
    condition: 'is within',
    query: defaultDate,
  },
]
export default function ResourcesDashboard() {
  const { user } = useContext(UserContext)
  const [isLoading, setIsLoading] = useState(false)
  const [areReportsLoading, setAreReportsLoading] = useState(false)
  const [resourcesData, setResourcesData] = useState({})
  const [error, updateError] = useState()
  const [resetPagination, setResetPagination] = useState(false)
  const [activityReports, setActivityReports] = useState({
    count: 0,
    rows: [],
  })

  const [activityReportSortConfig, setActivityReportSortConfig] = useSessionSort(
    {
      sortBy: 'updatedAt',
      direction: 'desc',
      activePage: 1,
    },
    'resource-dashboard-activity-report-sort'
  )

  const { activePage } = activityReportSortConfig

  const [activityReportOffset, setActivityReportOffset] = useState((activePage - 1) * REPORTS_PER_PAGE)

  const {
    // from useUserDefaultRegionFilters
    regions,
    // defaultRegion,
    allRegionsFilters,

    // filter functionality
    filters,
    setFilters,
    onApplyFilters,
    onRemoveFilter,
    filterConfig,
  } = useFilters(user, REGIONAL_RESOURCE_DASHBOARD_FILTER_KEY, true, additionalDefaultFilters, RESOURCES_DASHBOARD_FILTER_CONFIG)

  const { reportIds } = resourcesData

  useEffect(() => {
    async function fetchReports() {
      try {
        setAreReportsLoading(true)
        const data = await getReportsViaIdPost(
          resourcesData.reportIds,
          activityReportSortConfig.sortBy,
          activityReportSortConfig.direction,
          activityReportOffset,
          REPORTS_PER_PAGE
        )
        setActivityReports(data)
        updateError('')
      } /* istanbul ignore next: cannot test console.log */ catch (e) {
        // eslint-disable-next-line no-console
        console.log(e)
        updateError('Unable to fetch reports')
      } finally {
        setAreReportsLoading(false)
      }
    }

    if (resourcesData.reportIds && resourcesData.reportIds.length > 0) {
      fetchReports()
    }
  }, [activityReportOffset, activityReportSortConfig.direction, activityReportSortConfig.sortBy, resourcesData.reportIds])

  useDeepCompareEffect(() => {
    async function fetcHResourcesData() {
      setIsLoading(true)
      // Filters passed also contains region.
      const filterQuery = filtersToQueryString(filters)
      try {
        const data = await fetchFlatResourceData(filterQuery)
        setResourcesData(data)
        updateError('')
      } catch (e) {
        updateError('Unable to fetch resources')
      } finally {
        setIsLoading(false)
      }
    }
    // Call resources fetch.
    fetcHResourcesData()
  }, [filters])

  const handleDownloadReports = async (setIsDownloading, setDownloadError, url, buttonRef) => {
    try {
      setIsDownloading(true)
      const blob = await downloadReports(url)
      const csv = URL.createObjectURL(blob)
      window.location.assign(csv)
    } /* istanbul ignore next: hard to test error on download */ catch (err) {
      setDownloadError(true)
    } finally {
      setIsDownloading(false)
      buttonRef.current.focus()
    }
  }

  const handleDownloadAllReports = async (setIsDownloading, setDownloadError, downloadAllButtonRef) => {
    const queryString = reportIds.map((i) => `id=${i}`).join('&')
    const downloadURL = getAllReportsDownloadURL(queryString)

    return handleDownloadReports(setIsDownloading, setDownloadError, downloadURL, downloadAllButtonRef)
  }

  /* istanbul ignore next: hard to test downloads */
  const handleDownloadClick = async (reportCheckboxes, setIsDownloading, setDownloadError, downloadSelectedButtonRef) => {
    const toDownloadableReportIds = (accumulator, entry) => {
      if (!activityReports.rows) return accumulator
      const [key, value] = entry
      if (value === false) return accumulator
      accumulator.push(key)
      return accumulator
    }

    const downloadable = Object.entries(reportCheckboxes).reduce(toDownloadableReportIds, [])
    if (downloadable.length) {
      const downloadURL = getReportsDownloadURL(downloadable)
      await handleDownloadReports(setIsDownloading, setDownloadError, downloadURL, downloadSelectedButtonRef)
    }
  }

  return (
    <div className="ttahub-resources-dashboard">
      <Helmet>
        <title>Resource Dashboard</title>
      </Helmet>
      <RegionPermissionModal
        filters={filters}
        user={user}
        showFilterWithMyRegions={() => showFilterWithMyRegions(allRegionsFilters, filters, setFilters)}
      />
      <h1 className="landing">Resource dashboard</h1>
      <Grid row>
        {error && (
          <Alert className="margin-bottom-2" type="error" role="alert">
            {error}
          </Alert>
        )}
      </Grid>
      <Grid className="ttahub-resources-dashboard--filters display-flex flex-wrap flex-align-center flex-gap-1 margin-bottom-2">
        <FilterPanel
          applyButtonAria="apply filters for resources dashboard"
          filters={filters}
          onApplyFilters={onApplyFilters}
          onRemoveFilter={onRemoveFilter}
          filterConfig={filterConfig}
          allUserRegions={regions}
        />
      </Grid>
      <ResourcesDashboardOverview data={resourcesData.resourcesDashboardOverview} loading={isLoading} />
      <ResourceUse data={resourcesData.resourcesUse} loading={isLoading} />
      <ResourcesAssociatedWithTopics
        data={resourcesData.topicUse}
        loading={isLoading}
        resetPagination={resetPagination}
        setResetPagination={setResetPagination}
      />
      <ReportsTable
        loading={areReportsLoading}
        reports={activityReports.rows}
        sortConfig={activityReportSortConfig}
        handleDownloadAllReports={handleDownloadAllReports}
        handleDownloadClick={handleDownloadClick}
        setSortConfig={setActivityReportSortConfig}
        offset={activityReportOffset}
        setOffset={setActivityReportOffset}
        tableCaption="Activity Reports"
        exportIdPrefix="activity-reports"
        reportsCount={activityReports.count}
        activePage={activePage}
      />
    </div>
  )
}

ResourcesDashboard.propTypes = {
  user: PropTypes.shape({
    id: PropTypes.number,
    name: PropTypes.string,
    role: PropTypes.arrayOf(PropTypes.string),
    homeRegionId: PropTypes.number,
    permissions: PropTypes.arrayOf(
      PropTypes.shape({
        userId: PropTypes.number,
        scopeId: PropTypes.number,
        regionId: PropTypes.number,
      })
    ),
  }),
}

ResourcesDashboard.defaultProps = {
  user: null,
}
