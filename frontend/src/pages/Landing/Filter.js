/* eslint-disable max-len */
import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Button } from '@trussworks/react-uswds';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import moment from 'moment';

import { faSortDown } from '@fortawesome/free-solid-svg-icons';
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

function Filter({ applyFilters, forMyAlerts }) {
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
    applyFilters(newFilters);
  };

  const onApplyFilter = () => {
    applyFilters(filters);
  };

  const hasFilters = filters.length !== 0;
  let filterClass = '';

  if (open) {
    filterClass = 'smart-hub--menu-button__open';
  }

  return (
    <span className="position-relative">
      <Button
        type="button"
        onClick={() => {
          updateOpen(!open);
        }}
        outline
        className={`smart-hub--filter-button smart-hub--table-controls__button ${filterClass}`}
      >
        {`Filters ${filters.length > 0 ? `(${filters.length})` : ''}`}
        {' '}
        <FontAwesomeIcon className="margin-left-1" size="1x" style={{ paddingBottom: '2px' }} color="black" icon={faSortDown} />
      </Button>
      {open && (
      <div className="z-400 position-absolute">
        <Container padding={2} className="margin-bottom-0">
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
                    forMyAlerts={forMyAlerts}
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
            <div className="height-20 margin-top-2 clearfix">
              <Button
                type="button"
                outline
                className="float-left smart-hub--filter-button"
                onClick={() => {
                  updateFilters([...filters, defaultFilter()]);
                }}
              >
                Add New Filter
              </Button>
              {hasFilters && (
              <Button
                type="button"
                className="float-right smart-hub--filter-button"
                onClick={onApplyFilter}
              >
                Apply Filters
              </Button>
              )}
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
  forMyAlerts: PropTypes.bool,
};

Filter.defaultProps = {
  forMyAlerts: false,
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
