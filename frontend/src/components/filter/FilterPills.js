import React from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimesCircle } from '@fortawesome/free-solid-svg-icons';
import Tooltip from '../Tooltip';
import { filterConfigProp, filterProp } from './props';
import './FilterPills.css';
import colors from '../../colors';

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

  const determineFilterName = () => {
    const filterConfigToUse = filterConfig.find((f) => f.id === topic);
    if (filterConfigToUse) {
      return filterConfigToUse.display;
    }
    return topic === 'region' ? 'Region' : null;
  };

  const filterName = determineFilterName();

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

  const determineConditionText = () => {
    if (!condition) {
      return null;
    }
    if (topic === 'myReports') {
      return condition;
    }
    return condition.toLowerCase();
  };

  return (
    <span className="filter-pill text-middle">
      <span className="display-inline-block margin-bottom-05 margin-right-05">
        {isFirst ? null : <strong> AND </strong>}
        <strong>
          {filterName}
        </strong>
        {' '}
        {determineConditionText()}
      </span>
      <span className="filter-pill-container display-inline-block smart-hub-border-blue-primary border-2px radius-pill padding-right-1 padding-left-2 padding-y-05">
        <span aria-label={queryValue}>
          {' '}
          {
            showToolTip
              ? (
                <Tooltip
                  displayText={queryShortValue}
                  screenReadDisplayText={false}
                  buttonLabel={queryValue}
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
          <FontAwesomeIcon className="margin-left-1 margin-top-2px filter-pills-cursor" color={colors.ttahubMediumBlue} icon={faTimesCircle} />
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
