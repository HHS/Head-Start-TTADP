import React from 'react';
import PropTypes from 'prop-types';
import { getReports, downloadReports } from '../../fetchers/activityReports';
import { getReportsDownloadURL, getAllReportsDownloadURL } from '../../fetchers/helpers';
import ReportsTable from './ReportsTable';
import ScrollableReportsTable from '../ScrollableReportsTable';

function ActivityReportsTable({
  filters,
  tableCaption,
  exportIdPrefix,
  resetPagination,
  setResetPagination,
}) {
  return (
    <ScrollableReportsTable
      filters={filters}
      tableCaption={tableCaption}
      exportIdPrefix={exportIdPrefix}
      resetPagination={resetPagination}
      setResetPagination={setResetPagination}
      sessionSortKey="activityReportsTable"
      getReportsDownloadUrl={getReportsDownloadURL}
      getAllReportsDownloadUrl={getAllReportsDownloadURL}
      getReports={getReports}
      downloadReports={downloadReports}
      ReportsTable={ReportsTable}
      defaultSortBy="updatedAt"
    />
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
    }),
  ).isRequired,
  tableCaption: PropTypes.string.isRequired,
  resetPagination: PropTypes.bool,
  setResetPagination: PropTypes.func.isRequired,
};

ActivityReportsTable.defaultProps = {
  resetPagination: false,
};

export default ActivityReportsTable;
