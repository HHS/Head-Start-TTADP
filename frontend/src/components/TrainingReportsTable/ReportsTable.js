import React from 'react';
import PropTypes from 'prop-types';
import BaseReportsTable from '../ScrollableReportsTable/ReportsTable';
import ReportRow from './ReportRow';

const columns = [
  { displayName: 'Event ID', fieldName: 'eventId' },
  { displayName: 'Event title', fieldName: 'eventName' },
  { displayName: 'Session name', fieldName: 'sessionName' },
  { displayName: 'Session start date', fieldName: 'startDate' },
  { displayName: 'Session end date', fieldName: 'endDate' },
  { displayName: 'Topics', fieldName: 'topics' },
];

export default function ReportsTable({
  loading,
  reports,
  sortConfig,
  setSortConfig,
  offset,
  setOffset,
  tableCaption,
  exportIdPrefix,
  reportsCount,
  activePage,
  getReportsDownloadUrl,
  getAllReportsDownloadUrl,
  downloadReports,
  filterQuery,
}) {
  return (
    <BaseReportsTable
      loading={loading}
      reports={reports}
      sortConfig={sortConfig}
      setSortConfig={setSortConfig}
      offset={offset}
      setOffset={setOffset}
      tableCaption={tableCaption}
      exportIdPrefix={exportIdPrefix}
      reportsCount={reportsCount}
      activePage={activePage}
      getReportsDownloadUrl={getReportsDownloadUrl}
      getAllReportsDownloadUrl={getAllReportsDownloadUrl}
      downloadReports={downloadReports}
      filterQuery={filterQuery}
      columns={columns}
      RowComponent={ReportRow}
      loadingLabel="Training reports table loading"
    />
  );
}

ReportsTable.propTypes = {
  loading: PropTypes.bool.isRequired,
  reports: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number,
      eventId: PropTypes.string,
      eventName: PropTypes.string,
      sessionName: PropTypes.string,
      startDate: PropTypes.string,
      endDate: PropTypes.string,
    }),
  ).isRequired,
  sortConfig: PropTypes.shape({
    sortBy: PropTypes.string,
    direction: PropTypes.string,
    activePage: PropTypes.number,
  }).isRequired,
  setSortConfig: PropTypes.func.isRequired,
  offset: PropTypes.number.isRequired,
  setOffset: PropTypes.func.isRequired,
  tableCaption: PropTypes.string.isRequired,
  exportIdPrefix: PropTypes.string.isRequired,
  reportsCount: PropTypes.number.isRequired,
  activePage: PropTypes.number.isRequired,
  getReportsDownloadUrl: PropTypes.func.isRequired,
  getAllReportsDownloadUrl: PropTypes.func.isRequired,
  downloadReports: PropTypes.func.isRequired,
  filterQuery: PropTypes.string.isRequired,
};
