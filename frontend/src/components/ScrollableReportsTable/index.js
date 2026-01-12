/* eslint-disable jsx-a11y/anchor-is-valid */
import React, { useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  Grid,
  Alert,
} from '@trussworks/react-uswds';
import { filtersToQueryString } from '../../utils';
import { REPORTS_PER_PAGE } from '../../Constants';
import useSessionSort from '../../hooks/useSessionSort';
import useFetch from '../../hooks/useFetch';
import BaseReportsTable from './ReportsTable';
import './index.css';

function ScrollableReportsTable({
  filters,
  tableCaption,
  exportIdPrefix,
  resetPagination,
  setResetPagination,
  sessionSortKey,
  defaultSortBy,

  // child components
  ReportsTable = BaseReportsTable,

  /* functions */
  // url constructor
  getReportsDownloadUrl,
  getAllReportsDownloadUrl,

  // fetchers
  getReports,
  downloadReports,
}) {
  const [sortConfig, setSortConfig] = useSessionSort({
    sortBy: defaultSortBy,
    direction: 'desc',
    activePage: 1,
  }, sessionSortKey);

  const { activePage } = sortConfig;
  const [offset, setOffset] = useState((activePage - 1) * REPORTS_PER_PAGE);

  const filterQuery = useMemo(() => filtersToQueryString(filters || []), [filters]);

  // a side effect that resets the pagination when the filters change
  useEffect(() => {
    if (resetPagination) {
      setSortConfig({ ...sortConfig, activePage: 1 });
      setOffset(0); // 0 times perpage = 0
      setResetPagination(false);
    }
  }, [activePage, resetPagination, setResetPagination, setSortConfig, sortConfig]);

  const { data, error } = useFetch(
    {
      rows: [],
      count: 0,
    },
    async () => {
      if (resetPagination) {
        return data;
      }
      return getReports(
        sortConfig.sortBy,
        sortConfig.direction,
        offset,
        REPORTS_PER_PAGE,
        filterQuery,
      );
    },
    [sortConfig, offset, resetPagination, getReports, filterQuery],
    'Unable to fetch reports',
  );

  const reportsCount = data && data.count ? data.count : 0;
  const reports = data && data.rows ? data.rows : [];

  return (
    <>
      {error && (
      <Grid row>
        <Alert type="error" role="alert">
          {error}
        </Alert>
      </Grid>
      )}

      <ReportsTable
        reportsCount={reportsCount}
        tableCaption={tableCaption}
        exportIdPrefix={exportIdPrefix}
        loading={false}
        reports={reports}
        sortConfig={sortConfig}
        setSortConfig={setSortConfig}
        offset={offset}
        setOffset={setOffset}
        activePage={activePage}
        getReportsDownloadUrl={getReportsDownloadUrl}
        getAllReportsDownloadUrl={getAllReportsDownloadUrl}
        downloadReports={downloadReports}
        filterQuery={filterQuery}
      />
    </>
  );
}

ScrollableReportsTable.propTypes = {
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
    }),
  ).isRequired,
  tableCaption: PropTypes.string.isRequired,
  resetPagination: PropTypes.bool,
  setResetPagination: PropTypes.func.isRequired,
  sessionSortKey: PropTypes.string.isRequired,
  ReportsTable: PropTypes.elementType,
  getReportsDownloadUrl: PropTypes.func.isRequired,
  getAllReportsDownloadUrl: PropTypes.func.isRequired,
  getReports: PropTypes.func.isRequired,
  downloadReports: PropTypes.func.isRequired,
  defaultSortBy: PropTypes.string.isRequired,
};

ScrollableReportsTable.defaultProps = {
  resetPagination: false,
  ReportsTable: BaseReportsTable,
};

export default ScrollableReportsTable;
