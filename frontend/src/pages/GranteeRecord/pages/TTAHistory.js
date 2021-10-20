import React from 'react';
import PropTypes from 'prop-types';
import Overview from '../../../widgets/DashboardOverview';
import FilterMenu from '../../../components/FilterMenu';

function expandFilters(filters) {
  const arr = [];

  filters.forEach((filter) => {
    const { topic, query, condition } = filter;
    if (Array.isArray(query)) {
      query.forEach((q) => {
        arr.push({
          topic,
          condition,
          query: q,
        });
      });
    } else {
      arr.push(filter);
    }
  });

  return arr;
}

export default function TTAHistory({ baseFilters, filters, onApplyFilters }) {
  const filtersToApply = [
    ...baseFilters,
    ...expandFilters(filters),
  ];

  const onApply = (newFilters) => {
    onApplyFilters([
      ...baseFilters,
      ...expandFilters(newFilters),
    ]);
  };

  return (
    <div className="margin-right-3">
      <FilterMenu filters={baseFilters} onApplyFilters={onApply} />
      <Overview filters={filtersToApply} />
    </div>
  );
}

const filtersProp = PropTypes.arrayOf(PropTypes.shape({
  id: PropTypes.string,
  topic: PropTypes.string,
  condition: PropTypes.string,
  query: PropTypes.oneOfType(
    [PropTypes.string, PropTypes.number, PropTypes.arrayOf(PropTypes.string)],
  ),
}));

TTAHistory.propTypes = {
  filters: filtersProp,
  baseFilters: filtersProp,
  onApplyFilters: PropTypes.func.isRequired,
};

TTAHistory.defaultProps = {
  filters: [],
  baseFilters: [],
};
