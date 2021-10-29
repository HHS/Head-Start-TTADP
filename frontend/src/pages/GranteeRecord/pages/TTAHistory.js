import React from 'react';
import PropTypes from 'prop-types';
import { Helmet } from 'react-helmet';
import Overview from '../../../widgets/DashboardOverview';
import FilterMenu from '../../../components/FilterMenu';
import TargetPopulationsTable from '../../../widgets/TargetPopulationsTable';

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

export default function TTAHistory({
  filters, onApplyFilters, filtersForWidgets, granteeName,
}) {
  const onApply = (newFilters) => {
    onApplyFilters([
      ...newFilters,
    ]);
  };

  const filtersToApply = [
    ...expandFilters(filters),
    ...filtersForWidgets,
  ];

  return (
    <>
      <Helmet>
        <title>
          Grantee TTA History -
          {' '}
          {granteeName}
        </title>
      </Helmet>
      <div className="margin-x-2">
        <FilterMenu filters={filters} onApplyFilters={onApply} />
        <Overview
          fields={[
            'Activity reports',
            'Hours of TTA',
            'Participants',
            'In-person activities',
          ]}
          showTooltips
          filters={filtersToApply}
        />
        <div>
          <TargetPopulationsTable
            filters={filtersToApply}
          />
        </div>
      </div>
    </>
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
  onApplyFilters: PropTypes.func.isRequired,
  filtersForWidgets: filtersProp,
  granteeName: PropTypes.string,
};

TTAHistory.defaultProps = {
  filters: [],
  filtersForWidgets: [],
  granteeName: '',
};
