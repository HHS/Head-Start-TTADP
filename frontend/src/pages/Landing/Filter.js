/* eslint-disable max-len */
import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Button } from '@trussworks/react-uswds';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import moment from 'moment';

import {
  faFilter,
  faPlus,
  faCheck,
} from '@fortawesome/free-solid-svg-icons';
import { v4 as uuidv4 } from 'uuid';

import Container from '../../components/Container';
import FilterItem from './FilterItem';
import {
  WITHIN,
  DATE_FMT,
  QUERY_CONDITIONS,
} from './constants';
import './Filter.css';

const defaultFilter = () => (
  {
    id: uuidv4(),
    topic: '',
    condition: '',
    query: '',
  }
);

function Filter({ applyFilters }) {
  const [open, updateOpen] = useState(false);
  const [filters, updateFilters] = useState([]);

  const onFilterUpdated = (index, name, value) => {
    const newFilters = [...filters];
    const filter = newFilters[index];

    // Topic or condition has changed so we need to clear out the query
    if (name !== 'query') {
      filter.query = '';
    }

    filter[name] = value;
    newFilters[index] = filter;
    updateFilters(newFilters);
  };

  const onRemoveFilter = (index) => {
    const newFilters = [...filters];
    newFilters.splice(index, 1);
    updateFilters(newFilters);
  };

  const onApplyFilter = () => {
    applyFilters(filters);
  };

  const hasFilters = filters.length !== 0;
  let filterClass = '';

  if (open) {
    filterClass = 'smart-hub--filter-menu-button__open';
  } else if (hasFilters) {
    filterClass = 'smart-hub--filter-menu-button__selected';
  }

  return (
    <span className="position-relative">
      <Button
        type="button"
        onClick={() => { updateOpen(!open); }}
        unstyled
        className={`smart-hub--filter-button smart-hub--filter-menu-button ${filterClass}`}
      >
        <FontAwesomeIcon color="black" icon={faFilter} />
        {' '}
        {hasFilters ? `${filters.length} Filters` : 'Filter'}
      </Button>
      {open && (
      <div className="z-400 position-absolute right-105">
        <Container padding={2}>
          <div className="font-body-2xs">
            {hasFilters && (
              <>
                {filters.map((f, index) => (
                  <FilterItem
                    key={f.id}
                    id={f.id}
                    condition={f.condition}
                    topic={f.topic}
                    query={f.query}
                    onRemoveFilter={() => onRemoveFilter(index)}
                    onUpdateFilter={(name, value) => {
                      onFilterUpdated(index, name, value);
                    }}
                  />
                ))}
              </>
            )}
            {!hasFilters && (
            <div className="smart-hub--minw-1205">
              No filters have been applied
            </div>
            )}
            <div className="margin-top-2 padding-bottom-2">
              <Button
                type="button"
                unstyled
                className="float-left smart-hub--filter-button"
                onClick={() => {
                  updateFilters([...filters, defaultFilter()]);
                }}
              >
                <FontAwesomeIcon size="xs" icon={faPlus} />
                {' '}
                Add filter
              </Button>
              <Button
                type="button"
                className="float-right smart-hub--filter-button"
                unstyled
                onClick={onApplyFilter}
              >
                <FontAwesomeIcon size="xs" icon={faCheck} />
                {' '}
                Apply
              </Button>

            </div>
          </div>
        </Container>
      </div>
      )}
    </span>
  );
}

Filter.propTypes = {
  applyFilters: PropTypes.func.isRequired,
};

export function filtersToQueryString(filters) {
  const filtersWithValues = filters.filter((f) => {
    if (f.condition === WITHIN) {
      const [startDate, endDate] = f.query.split('-');
      return moment(startDate, DATE_FMT).isValid() && moment(endDate, DATE_FMT).isValid();
    }
    return f.query !== '';
  });
  const queryFragments = filtersWithValues.map((filter) => {
    const con = QUERY_CONDITIONS[filter.condition];
    return `${filter.topic}.${con}=${filter.query}`;
  });
  return queryFragments.join('&');
}

export default Filter;
