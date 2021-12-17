import React from 'react';
import PropTypes from 'prop-types';
import FilterMenu from './FilterMenu';
import FilterPills from './FilterPills';
import { formatDateRange } from '../DateRangeSelect';
import { filterProp } from './props';
import { AVAILABLE_FILTERS } from './constants';

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
  allowedFilters: PropTypes.arrayOf(PropTypes.string),
  dateRangeOptions: PropTypes.arrayOf(PropTypes.shape({
    label: PropTypes.string,
    value: PropTypes.number,
    range: PropTypes.string,
  })),
  applyButtonAria: PropTypes.string.isRequired,
};

FilterPanel.defaultProps = {
  allowedFilters: AVAILABLE_FILTERS,
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
