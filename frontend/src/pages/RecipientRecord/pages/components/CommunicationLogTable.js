import React from 'react';
import PropTypes from 'prop-types';
import { Table } from '@trussworks/react-uswds';
import { Link } from 'react-router-dom';
import './CommunicationLogTable.scss';

export default function CommunicationLogTable({
  requestSort,
  sortConfig,
  logs,
  recipientId,
  regionId,
}) {
  const getClassNamesFor = (name) => (sortConfig.sortBy === name ? sortConfig.direction : '');
  const renderColumnHeader = (displayName, name, className) => {
    const sortClassName = getClassNamesFor(name);
    let fullAriaSort;
    switch (sortClassName) {
      case 'asc':
        fullAriaSort = 'ascending';
        break;
      case 'desc':
        fullAriaSort = 'descending';
        break;
      default:
        fullAriaSort = 'none';
        break;
    }
    return (
      <th scope="col" className={className} aria-sort={fullAriaSort}>
        <button
          type="button"
          onClick={() => {
            requestSort(name);
          }}
          onKeyDown={() => requestSort(name)}
          className={`usa-button usa-button--unstyled sortable ${sortClassName}`}
          aria-label={`${displayName}. Activate to sort ${sortClassName === 'asc' ? 'descending' : 'ascending'
          }`}
        >
          {displayName}
        </button>
      </th>
    );
  };

  return (
    <div className="ttahub-communication-log-table">
      <Table fullWidth striped stackedStyle="default">
        <caption className="usa-sr-only">
          Communications with sorting and pagination
        </caption>
        <thead>
          <tr>
            {renderColumnHeader('Date', 'communicationDate', 'maxw-4')}
            {renderColumnHeader('Purpose', 'purpose')}
            {renderColumnHeader('Creator name', 'authorName')}
            {renderColumnHeader('Result', 'result')}
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr>
              <td className="maxw-4" data-label="Date">
                <Link to={`/recipient-tta-records/${recipientId}/region/${regionId}/communication/${log.id}/view`}>
                  {log.data.communicationDate}
                </Link>
              </td>
              <td data-label="Purpose">{log.data.purpose}</td>
              <td data-label="Creator name">{log.authorName}</td>
              <td data-label="Result">{log.data.result}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}

CommunicationLogTable.propTypes = {
  logs: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.number,
    data: PropTypes.shape({
      communicationDate: PropTypes.string,
      purpose: PropTypes.string,
      result: PropTypes.string,
    }),
    userId: PropTypes.string,
  })).isRequired,
  requestSort: PropTypes.func.isRequired,
  sortConfig: PropTypes.shape({
    sortBy: PropTypes.string,
    direction: PropTypes.string,
  }).isRequired,
  recipientId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  regionId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
};
