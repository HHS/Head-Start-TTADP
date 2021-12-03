import React from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimesCircle } from '@fortawesome/free-solid-svg-icons';
import moment from 'moment';
import { formatDateRange } from '../DateRangeSelect';
import Tooltip from '../Tooltip';
import './FilterPills.css';

const filterProp = PropTypes.shape({
  topic: PropTypes.string,
  condition: PropTypes.string,
  query: PropTypes.oneOfType([PropTypes.string, PropTypes.arrayOf(PropTypes.string)]),
  id: PropTypes.string,
});

/* Pill */
export function Pill({ filter, isFirst, onRemoveFilter }) {
  const {
    id,
    topic,
    condition,
    query,
  } = filter;

  const handleArrayQuery = (q) => {
    if (q.length) {
      return q.join(', ');
    }
    return '';
  };

  const filterNameLookup = [
    {
      topic: 'reason',
      display: 'Reason',
      query: () => handleArrayQuery(query),
    },
    {
      topic: 'programSpecialist',
      display: 'Program Specialist',
      query: () => query,
    },
    {
      topic: 'role',
      display: 'Specialist',
      query: () => handleArrayQuery(query),
    },
    {
      topic: 'startDate',
      display: 'Date Range',
      query: () => {
        if (query.includes('-')) {
          return formatDateRange({
            string: query,
            withSpaces: false,
          });
        }
        return moment(query, 'YYYY/MM/DD').format('MM/DD/YYYY');
      },
    },
  ];

  const determineFilterName = () => {
    const topicMatch = filterNameLookup.find((f) => f.topic === topic);
    if (topicMatch) {
      return topicMatch.display;
    }
    return topic;
  };

  let showToolTip = false;

  const truncateQuery = (queryToTruncate) => {
    let queryToReturn = queryToTruncate;
    if (queryToReturn.length > 40) {
      queryToReturn = queryToReturn.substring(0, 40);
      queryToReturn += '...';
      showToolTip = true;
    }
    return queryToReturn;
  };

  const determineQuery = (keepOriginalLength = true) => {
    const queryMatch = filterNameLookup.find((f) => f.topic === topic);
    if (queryMatch) {
      const queryToReturn = queryMatch.query();
      return keepOriginalLength ? queryToReturn : truncateQuery(queryToReturn);
    }
    return query;
  };

  const filterName = determineFilterName();
  const queryValue = determineQuery();
  const ariaButtonText = `This button removes the filter: ${filterName} ${condition} ${queryValue}`;
  const queryShortValue = determineQuery(false);

  return (
    <span className="text-middle margin-right-05 padding-top-1 margin-bottom-105">
      {isFirst ? null : <strong> AND </strong>}
      <span className="margin-right-05">
        <strong>
          {filterName}
        </strong>
        {' '}
        {condition ? condition.toLowerCase() : null}
      </span>
      <span className="filter-pill-container smart-hub-border-blue-primary border-2px margin-right-1 radius-pill padding-right-1 padding-left-2 padding-y-05">
        <span aria-label={queryValue}>
          {' '}
          {
            showToolTip
              ? (
                <Tooltip
                  displayText={queryShortValue}
                  screenReadDisplayText={false}
                  buttonLabel={`${queryShortValue} click to visually reveal this information`}
                  tooltipText={queryValue}
                  hideUnderline
                />
              )
              : queryValue
          }

        </span>
        <button
          className="usa-button usa-button--unstyled"
          type="button"
          aria-label={ariaButtonText}
          onClick={() => {
            onRemoveFilter(id);
          }}
        >
          <FontAwesomeIcon className="margin-left-1 margin-top-2px  filter-pills-cursor" color="#0166ab" icon={faTimesCircle} />
        </button>
      </span>
    </span>
  );
}

Pill.propTypes = {
  filter: filterProp.isRequired,
  isFirst: PropTypes.bool.isRequired,
  onRemoveFilter: PropTypes.func.isRequired,
};

/**
 * Sometimes a filter will be created and will not have a pill
 * This list contains all the Pill Topics that are verboten
 */

const DISALLOWED_PILL_TOPICS = [
  'region',
];

/* Filter Pills */
export default function FilterPills({ filters, onRemoveFilter }) {
  return (
    <>
      {
        filters.filter(
          (filter) => !DISALLOWED_PILL_TOPICS.includes(filter.topic),
        ).map((filter, index) => (
          <Pill
            id={filter.id}
            key={filter.id}
            filter={filter}
            isFirst={index === 0}
            onRemoveFilter={onRemoveFilter}
          />
        ))
      }
    </>
  );
}

FilterPills.propTypes = {
  filters: PropTypes.arrayOf(filterProp).isRequired,
  onRemoveFilter: PropTypes.func.isRequired,
};
