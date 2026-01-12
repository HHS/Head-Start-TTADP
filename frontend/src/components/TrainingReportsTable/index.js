import React from 'react';
import PropTypes from 'prop-types';
import { getSessionReports, downloadSessionReports } from '../../fetchers/sessionReports';
import { getSessionReportsDownloadURL, getAllSessionReportsDownloadURL } from '../../fetchers/helpers';
import ReportsTable from './ReportsTable';
import ScrollableReportsTable from '../ScrollableReportsTable';

function TrainingReportsTable({
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
      sessionSortKey="trainingReportsTable"
      getReportsDownloadUrl={getSessionReportsDownloadURL}
      getAllReportsDownloadUrl={getAllSessionReportsDownloadURL}
      getReports={getSessionReports}
      downloadReports={downloadSessionReports}
      ReportsTable={ReportsTable}
    />
  );
}

TrainingReportsTable.propTypes = {
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

TrainingReportsTable.defaultProps = {
  resetPagination: false,
};

export default TrainingReportsTable;
