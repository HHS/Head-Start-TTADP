import React from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Helmet } from 'react-helmet';
import PropTypes from 'prop-types';
import useUrlFilters from '../../../hooks/useUrlFilters';
import FilterPanel from '../../../components/filter/FilterPanel';
import { formatDateRange } from '../../../utils';
import { GOALS_AND_OBJECTIVES_FILTER_CONFIG } from './constants';
import GoalsTable from '../../../components/GoalsTable/GoalsTable';

export default function GoalsObjectives({ recipientId, regionId }) {
  // eslint-disable-next-line no-unused-vars
  const yearToDate = formatDateRange({ yearToDate: true, forDateTime: true });

  const [filters, setFilters] = useUrlFilters([{
    id: uuidv4(),
    topic: 'createDate',
    condition: 'Is within',
    query: yearToDate,
  }]);

  const onRemoveFilter = (id) => {
    const newFilters = [...filters];
    const index = newFilters.findIndex((item) => item.id === id);
    if (index !== -1) {
      newFilters.splice(index, 1);
      setFilters(newFilters);
    }
  };

  return (
    <>
      <Helmet>
        <title>
          Goals and Objectives
        </title>
      </Helmet>
      <div className="margin-x-2 maxw-widescreen" id="goalsObjectives">
        <div className="display-flex flex-wrap margin-bottom-2" data-testid="filter-panel">
          <FilterPanel
            onRemoveFilter={onRemoveFilter}
            onApplyFilters={setFilters}
            filterConfig={GOALS_AND_OBJECTIVES_FILTER_CONFIG}
            applyButtonAria="Apply filters to goals"
            filters={filters}
          />
        </div>
        <div id="goalsObjectives">
          <GoalsTable
            recipientId={recipientId}
            regionId={regionId}
            filters={filters}
          />
        </div>
      </div>
    </>
  );
}

GoalsObjectives.propTypes = {
  recipientId: PropTypes.string.isRequired,
  regionId: PropTypes.string.isRequired,
};
