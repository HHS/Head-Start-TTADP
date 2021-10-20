import React from 'react';
import PropTypes from 'prop-types';
import Overview from '../../../widgets/DashboardOverview';
import FilterMenu from '../../../components/FilterMenu';

export default function TTAHistory({ filters, onApplyFilters }) {
  return (
    <div className="margin-right-3">
      <FilterMenu filters={filters} onApplyFilters={onApplyFilters} />
      <Overview filters={filters} />
    </div>
  );
}

TTAHistory.propTypes = {
  filters: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string,
    topic: PropTypes.string,
    condition: PropTypes.string,
    query: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  })),
  onApplyFilters: PropTypes.func.isRequired,
};

TTAHistory.defaultProps = {
  filters: [],
};
