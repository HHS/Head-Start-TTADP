import React from 'react';
import PropTypes from 'prop-types';
import FilterMenu from './FilterMenu';
import FilterPills from './FilterPills';
import { formatDateRange } from '../DateRangeSelect';
import { filterProp } from './props';
import {
  START_DATE_FILTER,
  GRANT_NUMBER_FILTER,
  PROGRAM_SPECIALIST_FILTER,
  PROGRAM_TYPE_FILTER,
  REASON_FILTER,
  RECIPIENT_NAME_FILTER,
  REGION_FILTER,
  ROLE_FILTER,
  TARGET_POPULATION_FILTER,
  TOPICS_FILTER,
} from './constants';

export default function FilterPanel(props) {
  const { onRemoveFilter, filters } = props;

  return (
    <>
      <FilterMenu
        // eslint-disable-next-line react/jsx-props-no-spreading
        {...props}
      />
      <FilterPills
        filters={filters}
        onRemoveFilter={onRemoveFilter}
      />
    </>
  );
}

FilterPanel.propTypes = {
  filters: PropTypes.arrayOf(filterProp).isRequired,
  onApplyFilters: PropTypes.func.isRequired,
  onRemoveFilter: PropTypes.func.isRequired,
  allowedFilters: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string,
      display: PropTypes.string,
      conditions: PropTypes.arrayOf(PropTypes.string),
      defaultValues: PropTypes.shape({
        'Is within': PropTypes.string,
        'Is after': PropTypes.string,
        'Is before': PropTypes.string,
        Is: PropTypes.oneOfType([
          PropTypes.string,
          PropTypes.arrayOf(PropTypes.string),
        ]),
        'Is not': PropTypes.oneOfType([
          PropTypes.string,
          PropTypes.arrayOf(PropTypes.string),
        ]),
        Contains: PropTypes.string,
        'Does not contain': PropTypes.string,
      }),
      displayQuery: PropTypes.func,
      renderInput: PropTypes.func,
    }),
  ),
  dateRangeOptions: PropTypes.arrayOf(PropTypes.shape({
    label: PropTypes.string,
    value: PropTypes.number,
    range: PropTypes.string,
  })),
  applyButtonAria: PropTypes.string.isRequired,
};

FilterPanel.defaultProps = {
  allowedFilters: [
    START_DATE_FILTER,
    GRANT_NUMBER_FILTER,
    PROGRAM_SPECIALIST_FILTER,
    PROGRAM_TYPE_FILTER,
    REASON_FILTER,
    RECIPIENT_NAME_FILTER,
    REGION_FILTER,
    ROLE_FILTER,
    TARGET_POPULATION_FILTER,
    TOPICS_FILTER,
  ],
  dateRangeOptions: [
    {
      label: 'Year to date',
      value: 1,
      range: formatDateRange({ yearToDate: true, forDateTime: true }),
    },
    {
      label: 'Custom date range',
      value: 2,
      range: '',
    },
  ],
};
