import React from 'react';
import PropTypes from 'prop-types';
import BaseReportsTable from '../ScrollableReportsTable/ReportsTable';
import ReportRow from './ReportRow';

const columns = [
  { displayName: 'Report ID', fieldName: 'regionId' },
  { displayName: 'Recipient', fieldName: 'activityRecipients' },
  { displayName: 'Date started', fieldName: 'startDate' },
  { displayName: 'Creator', fieldName: 'author' },
  { displayName: 'Created date', fieldName: 'createdAt' },
  { displayName: 'Topics', fieldName: 'topics' },
  { displayName: 'Collaborators', fieldName: 'collaborators' },
  { displayName: 'Last saved', fieldName: 'updatedAt' },
  { displayName: 'Approved date', fieldName: 'approvedAt' },
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
      loadingLabel="Activity reports table loading"
    />
  );
}

ReportsTable.propTypes = {
  loading: PropTypes.bool.isRequired,
  reports: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number,
      regionId: PropTypes.number,
      activityRecipients: PropTypes.arrayOf(PropTypes.shape(
        { activityRecipientId: PropTypes.number },
      )),
      startDate: PropTypes.string,
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
