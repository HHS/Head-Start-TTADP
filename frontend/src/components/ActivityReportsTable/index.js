/* eslint-disable jsx-a11y/anchor-is-valid */
import React, { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import { Grid, Alert } from '@trussworks/react-uswds'
import { getReports, downloadReports } from '../../fetchers/activityReports'
import { getReportsDownloadURL, getAllReportsDownloadURL } from '../../fetchers/helpers'
import { filtersToQueryString } from '../../utils'
import ReportsTable from './ReportsTable'
import { REPORTS_PER_PAGE } from '../../Constants'
import useSessionSort from '../../hooks/useSessionSort'
import './index.css'

function ActivityReportsTable({ filters, tableCaption, exportIdPrefix, resetPagination, setResetPagination }) {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [reportsCount, setReportsCount] = useState(0)

  const [sortConfig, setSortConfig] = useSessionSort(
    {
      sortBy: 'updatedAt',
      direction: 'desc',
      activePage: 1,
    },
    'activityReportsTable'
  )

  const { activePage } = sortConfig
  const [offset, setOffset] = useState((activePage - 1) * REPORTS_PER_PAGE)

  // a side effect that resets the pagination when the filters change
  useEffect(() => {
    if (resetPagination) {
      setSortConfig({ ...sortConfig, activePage: 1 })
      setOffset(0) // 0 times perpage = 0
      setResetPagination(false)
    }
  }, [activePage, resetPagination, setResetPagination, setSortConfig, sortConfig])

  useEffect(() => {
    async function fetchReports() {
      setLoading(true)
      const filterQuery = filtersToQueryString(filters)
      try {
        const { count, rows } = await getReports(sortConfig.sortBy, sortConfig.direction, offset, REPORTS_PER_PAGE, filterQuery)

        setReports(rows)
        setReportsCount(count || 0)
        setError('')
      } catch (e) {
        // eslint-disable-next-line no-console
        console.log(e)
        setError('Unable to fetch reports')
      } finally {
        setLoading(false)
      }
    }

    /**
     * we don't want the state updates in reset pagination to trigger a fetch, except the last one
     */

    if (resetPagination) {
      return
    }

    fetchReports()
  }, [sortConfig, offset, filters, resetPagination])

  const handleDownloadAllReports = async (setIsDownloading, setDownloadError, downloadAllButtonRef) => {
    const filterQuery = filtersToQueryString(filters)
    const downloadURL = getAllReportsDownloadURL(filterQuery)

    /* istanbul ignore next: cannot test "assign" */
    try {
      // changed the way this works ever so slightly because I was thinking
      // you'd want a try/catch around the fetching of the reports and not the
      // window.location.assign
      setIsDownloading(true)
      const blob = await downloadReports(downloadURL)
      const csv = URL.createObjectURL(blob)
      window.location.assign(csv)
    } catch (err) {
      // eslint-disable-next-line no-console
      console.log(err)
      setDownloadError(true)
    } finally {
      setIsDownloading(false)
      downloadAllButtonRef.current.focus()
    }
  }

  /* istanbul ignore next: cannot test "assign" */
  const handleDownloadClick = async (reportCheckboxes, setIsDownloading, setDownloadError, downloadSelectedButtonRef) => {
    const toDownloadableReportIds = (accumulator, entry) => {
      if (!reports) return accumulator
      const [key, value] = entry
      if (value === false) return accumulator
      accumulator.push(key)
      return accumulator
    }

    const downloadable = Object.entries(reportCheckboxes).reduce(toDownloadableReportIds, [])
    if (downloadable.length) {
      const downloadURL = getReportsDownloadURL(downloadable)
      try {
        setIsDownloading(true)
        const blob = await downloadReports(downloadURL)
        const csv = URL.createObjectURL(blob)
        window.location.assign(csv)
      } catch (err) {
        // eslint-disable-next-line no-console
        console.log(err)
        setDownloadError(true)
      } finally {
        setIsDownloading(false)
        downloadSelectedButtonRef.current.focus()
      }
    }
  }

  return (
    <>
      <Grid row>
        {error && (
          <Alert type="error" role="alert">
            {error}
          </Alert>
        )}
      </Grid>

      <ReportsTable
        handleDownloadAllReports={handleDownloadAllReports}
        handleDownloadClick={handleDownloadClick}
        reportsCount={reportsCount}
        tableCaption={tableCaption}
        exportIdPrefix={exportIdPrefix}
        loading={loading}
        reports={reports}
        sortConfig={sortConfig}
        setSortConfig={setSortConfig}
        offset={offset}
        setOffset={setOffset}
        activePage={activePage}
      />
    </>
  )
}

ActivityReportsTable.propTypes = {
  exportIdPrefix: PropTypes.string.isRequired,
  filters: PropTypes.arrayOf(
    PropTypes.shape({
      condition: PropTypes.string,
      id: PropTypes.string,
      query: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.arrayOf(PropTypes.string), PropTypes.arrayOf(PropTypes.number)]),
      topic: PropTypes.string,
    })
  ).isRequired,
  tableCaption: PropTypes.string.isRequired,
  resetPagination: PropTypes.bool,
  setResetPagination: PropTypes.func.isRequired,
}

ActivityReportsTable.defaultProps = {
  resetPagination: false,
}

export default ActivityReportsTable
