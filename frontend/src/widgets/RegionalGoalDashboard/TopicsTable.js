import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { v4 as uuidv4 } from 'uuid';
import {
  Table,
} from '@trussworks/react-uswds';
import withWidgetData from '../withWidgetData';
import useSessionSort from '../../hooks/useSessionSort';
import Container from '../../components/Container';
import colors from '../../colors';

/**
 * statuses
 * @param {string} topic
 * @param {Object<{
 * 'Not Started': number;
 * 'In Progress': number;
 * 'Closed': number;
 * 'Suspended': number;
 * }>} statuses
 * @param {number} total
 */
function TopicRow({ topic, statuses, total }) {
  return (
    <tr key={topic}>
      <td>{topic}</td>
      <td>{statuses['Not Started']}</td>
      <td>{statuses['In Progress']}</td>
      <td>{statuses.Closed}</td>
      <td>{statuses.Suspended}</td>
      <td>{total}</td>
    </tr>
  );
}

TopicRow.propTypes = {
  topic: PropTypes.string.isRequired,
  statuses: PropTypes.shape({
    'Not Started': PropTypes.number,
    'In Progress': PropTypes.number,
    Closed: PropTypes.number,
    Suspended: PropTypes.number,
  }).isRequired,
  total: PropTypes.number.isRequired,
};

export function TopicsTableWidget({ data, loading }) {
  const [sortConfig, setSortConfig] = useSessionSort({
    sortBy: 'topic',
    direction: 'desc',
    activePage: 1,
  }, 'topicsTableWidget');
  const [sorted, setSorted] = useState(data);

  const requestSort = (sortBy) => {
    let direction = 'desc';
    if (sortConfig.sortBy === sortBy && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ sortBy, direction, activePage: 1 });
  };

  useEffect(() => {
    if (!data || !data.length) return;

    const sortedData = data.sort((a, b) => {
      const { sortBy, direction } = sortConfig;
      let prop = sortBy;
      let objA = a;
      let objB = b;

      if (sortBy.includes('statuses.')) {
        [, prop] = sortBy.split('.');
        objA = a.statuses;
        objB = b.statuses;
      }

      if (objA[prop].localeCompare) {
        return objA[prop].localeCompare(objB[prop]) * (direction === 'asc' ? 1 : -1);
      }

      if (objA[prop] > objB[prop]) {
        return direction === 'asc' ? 1 : -1;
      }

      if (objA[prop] < objB[prop]) {
        return direction === 'asc' ? -1 : 1;
      }

      return 0;
    });
    setSorted([...sortedData]);
  }, [sortConfig, data]);

  const getClassNamesFor = (name) => (sortConfig.sortBy === name ? sortConfig.direction : '');

  const renderColumnHeader = (displayName, name) => {
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
      <th scope="col" aria-sort={fullAriaSort}>
        <button
          type="button"
          onClick={() => {
            requestSort(name);
          }}
          onKeyDown={() => requestSort(name)}
          className={`sortable usa-button usa-button--unstyled ${sortClassName}`}
          aria-label={`${displayName}. Activate to sort ${sortClassName === 'asc' ? 'descending' : 'ascending'}`}
          style={{
            color: colors.textInk,
            textDecoration: 'none',
          }}
        >
          {displayName}
        </button>
      </th>
    );
  };

  return (
    <>
      <Container paddingX={3} paddingY={3} loading={loading} loadingLabel="topics table loading">
        <div className="landing inline-size-auto maxw-full margin-bottom-3">
          <div className="usa-table-container--scrollable">
            <Table fullWidth striped>
              <thead>
                <tr>
                  {renderColumnHeader('Topic', 'topic')}
                  {renderColumnHeader('Not Started', 'statuses.Not Started')}
                  {renderColumnHeader('In Progress', 'statuses.In Progress')}
                  {renderColumnHeader('Closed', 'statuses.Closed')}
                  {renderColumnHeader('Suspended', 'statuses.Suspended')}
                  {renderColumnHeader('Total', 'total')}
                </tr>
              </thead>
              <tbody>
                {sorted.map((row) => (
                  <TopicRow
                    key={uuidv4()}
                    topic={row.topic}
                    statuses={row.statuses}
                    total={row.total}
                  />
                ))}
              </tbody>
            </Table>
          </div>
        </div>
      </Container>
    </>
  );
}

TopicsTableWidget.propTypes = {
  data: PropTypes.arrayOf(PropTypes.shape({
    topic: PropTypes.string.isRequired,
    statuses: PropTypes.shape({
      'Not Started': PropTypes.number,
      'In Progress': PropTypes.number,
      Closed: PropTypes.number,
      Suspended: PropTypes.number,
    }).isRequired,
    total: PropTypes.number.isRequired,
  })),
  loading: PropTypes.bool.isRequired,
};

TopicsTableWidget.defaultProps = {
  data: [],
};

export default withWidgetData(TopicsTableWidget, 'topicsByGoalStatus');
