import React from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimesCircle } from '@fortawesome/free-solid-svg-icons';
import Tooltip from '../Tooltip';
import { filterConfigProp, filterProp } from './props';
import './FilterPills.css';

/* Pill */
export function Pill({
  filter, isFirst, onRemoveFilter, filterConfig,
}) {
  const {
    id,
    topic,
    condition,
    query,
  } = filter;

  const filterName = filterConfig.find((f) => f.id === topic).display;

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
    const queryMatch = filterConfig.find((f) => f.id === topic);
    if (queryMatch) {
      const queryToReturn = queryMatch.displayQuery(query);
      return keepOriginalLength ? queryToReturn : truncateQuery(queryToReturn);
    }
    return query;
  };

  const queryValue = determineQuery();
  const ariaButtonText = `This button removes the filter: ${filterName} ${condition} ${queryValue}`;
  const queryShortValue = determineQuery(false);

  return (
    <span className="filter-pill text-middle margin-right-05 padding-top-1 margin-bottom-105">
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
  filterConfig: PropTypes.arrayOf(filterConfigProp).isRequired,
};

/* Filter Pills */
export default function FilterPills({ filters, onRemoveFilter, filterConfig }) {
  return filters.map((filter, index) => (
    <Pill
      id={filter.id}
      key={filter.id}
      filter={filter}
      isFirst={index === 0}
      onRemoveFilter={onRemoveFilter}
      filterConfig={filterConfig}
    />
  ));
}

FilterPills.propTypes = {
  filters: PropTypes.arrayOf(filterProp).isRequired,
  onRemoveFilter: PropTypes.func.isRequired,
  filterConfig: PropTypes.arrayOf(filterConfigProp).isRequired,
};
