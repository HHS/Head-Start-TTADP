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
  handleDownloadAllReports,
  handleDownloadClick,
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
      handleDownloadAllReports={handleDownloadAllReports}
      handleDownloadClick={handleDownloadClick}
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
  handleDownloadAllReports: PropTypes.func.isRequired,
  handleDownloadClick: PropTypes.func.isRequired,
  activePage: PropTypes.number.isRequired,
};
