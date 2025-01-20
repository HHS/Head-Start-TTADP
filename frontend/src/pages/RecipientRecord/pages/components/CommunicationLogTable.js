import React from 'react';
import PropTypes from 'prop-types';
import HorizontalTableWidget from '../../../../widgets/HorizontalTableWidget';
import './CommunicationLogTable.scss';

export default function CommunicationLogTable({
  requestSort,
  sortConfig,
  logs,
  recipientId,
  regionId,
}) {
  const headers = ['Date', 'Purpose', 'Goals', 'Creator name', 'Other TTA staff', 'Result'];
  const data = logs.map((log) => ({
    heading: log.displayId,
    isUrl: true,
    isInternalLink: true,
    link: `/recipient-tta-records/${recipientId}/region/${regionId}/communication/${log.id}/view`,
    data: [
      { title: 'Date', value: log.data.communicationDate },
      { title: 'Purpose', value: log.data.purpose },
      { title: 'Goals', value: (log.data.goals || []).map((g) => g.label).join(', ') },
      { title: 'Creator name', value: log.authorName },
      { title: 'Other TTA staff', value: (log.data.otherStaff || []).map((u) => u.label).join(', ') },
      { title: 'Result', value: log.data.result },
    ],
  }));

  return (
    <div className="ttahub-communication-log-table">
      <HorizontalTableWidget
        headers={headers}
        data={data}
        firstHeading="Report ID"
        enableSorting
        sortConfig={sortConfig}
        requestSort={requestSort}
        showTotalColumn={false}
      />
    </div>
  );
}

CommunicationLogTable.propTypes = {
  logs: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.number,
    displayId: PropTypes.string,
    data: PropTypes.shape({
      communicationDate: PropTypes.string,
      purpose: PropTypes.string,
      result: PropTypes.string,
    }),
    userId: PropTypes.number,
  })).isRequired,
  requestSort: PropTypes.func.isRequired,
  sortConfig: PropTypes.shape({
    sortBy: PropTypes.string,
    direction: PropTypes.string,
  }).isRequired,
  recipientId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  regionId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
};
