/* eslint-disable jsx-a11y/anchor-is-valid */

import { Alert, Grid } from '@trussworks/react-uswds';
import PropTypes from 'prop-types';
import React, { useEffect, useState } from 'react';
import { REPORTS_PER_PAGE } from '../../Constants';
import { downloadActivityReportExport, getReports } from '../../fetchers/activityReports';
import useSessionSort from '../../hooks/useSessionSort';
import { filtersToQueryString } from '../../utils';
import ReportsTable from './ReportsTable';
import './index.css';

function ActivityReportsTable({
  filters,
  tableCaption,
  exportIdPrefix,
  resetPagination,
  setResetPagination,
}) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [reportsCount, setReportsCount] = useState(0);

  const [sortConfig, setSortConfig] = useSessionSort(
    {
      sortBy: 'updatedAt',
      direction: 'desc',
      activePage: 1,
    },
    'activityReportsTable'
  );

  const { activePage } = sortConfig;
  const [offset, setOffset] = useState((activePage - 1) * REPORTS_PER_PAGE);

  // a side effect that resets the pagination when the filters change
  useEffect(() => {
    if (resetPagination) {
      setSortConfig({ ...sortConfig, activePage: 1 });
      setOffset(0); // 0 times perpage = 0
      setResetPagination(false);
    }
  }, [activePage, resetPagination, setResetPagination, setSortConfig, sortConfig]);

  useEffect(() => {
    async function fetchReports() {
      setLoading(true);
      const filterQuery = filtersToQueryString(filters);
      try {
        const { count, rows } = await getReports(
          sortConfig.sortBy,
          sortConfig.direction,
          offset,
          REPORTS_PER_PAGE,
          filterQuery
        );

        setReports(rows);
        setReportsCount(count || 0);
        setError('');
      } catch (e) {
        // eslint-disable-next-line no-console
        console.log(e);
        setError('Unable to fetch reports');
      } finally {
        setLoading(false);
      }
    }

    /**
     * we don't want the state updates in reset pagination to trigger a fetch, except the last one
     */

    if (resetPagination) {
      return;
    }

    fetchReports();
  }, [sortConfig, offset, filters, resetPagination]);

  const handleExport = async (dataSet, reportIds) => {
    let csv;
    try {
      const blob = await downloadActivityReportExport(
        dataSet,
        reportIds,
        filtersToQueryString(filters)
      );
      csv = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = csv;
      link.download = `${dataSet}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      throw new Error(
        err.data?.error || 'Sorry, something went wrong. Please try your request again.'
      );
    } finally {
      if (csv) URL.revokeObjectURL(csv);
    }
  };

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
        onExport={handleExport}
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
  );
}

ActivityReportsTable.propTypes = {
  exportIdPrefix: PropTypes.string.isRequired,
  filters: PropTypes.arrayOf(
    PropTypes.shape({
      condition: PropTypes.string,
      id: PropTypes.string,
      query: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.number,
        PropTypes.arrayOf(PropTypes.string),
        PropTypes.arrayOf(PropTypes.number),
      ]),
      topic: PropTypes.string,
    })
  ).isRequired,
  tableCaption: PropTypes.string.isRequired,
  resetPagination: PropTypes.bool,
  setResetPagination: PropTypes.func.isRequired,
};

ActivityReportsTable.defaultProps = {
  resetPagination: false,
};

export default ActivityReportsTable;
