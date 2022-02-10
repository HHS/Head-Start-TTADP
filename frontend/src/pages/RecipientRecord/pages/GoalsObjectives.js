import React from 'react';
import PropTypes from 'prop-types';
import { v4 as uuidv4 } from 'uuid';
import { Grid } from '@trussworks/react-uswds';
import useUrlFilters from '../../../hooks/useUrlFilters';
import FilterPanel from '../../../components/filter/FilterPanel';
import { expandFilters, formatDateRange } from '../../../utils';
import { GOALS_AND_OBJECTIVES_FILTER_CONFIG } from './constants';
import GoalStatusGraph from '../../../widgets/GoalStatusGraph';

const yearToDate = formatDateRange({ yearToDate: true, forDateTime: true });

export default function GoalsObjectives({ regionId, recipientId }) {
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

  const filtersToApply = [
    ...expandFilters(filters),
    {
      topic: 'region',
      condition: 'Is',
      query: regionId,
    },
    {
      topic: 'recipientId',
      condition: 'Contains',
      query: recipientId,
    },
  ];

  return (
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
      <Grid row>
        <Grid desktop={{ col: 6 }} mobileLg={{ col: 12 }}>
          <GoalStatusGraph filters={filtersToApply} />
        </Grid>
      </Grid>
    </div>
  );
}

GoalsObjectives.propTypes = {
  recipientId: PropTypes.string.isRequired,
  regionId: PropTypes.string.isRequired,
};
