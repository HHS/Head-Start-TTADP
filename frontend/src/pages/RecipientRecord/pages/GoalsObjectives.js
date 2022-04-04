import React from 'react';
import PropTypes from 'prop-types';
import { v4 as uuidv4 } from 'uuid';
import { Grid } from '@trussworks/react-uswds';
import { Helmet } from 'react-helmet';
import ReactRouterPropTypes from 'react-router-prop-types';
import useSessionFiltersAndReflectInUrl from '../../../hooks/useSessionFiltersAndReflectInUrl';
import FilterPanel from '../../../components/filter/FilterPanel';
import { expandFilters, formatDateRange } from '../../../utils';
import { getGoalsAndObjectivesFilterConfig } from './constants';
import GoalStatusGraph from '../../../widgets/GoalStatusGraph';
import GoalsTable from '../../../components/GoalsTable/GoalsTable';

export default function GoalsObjectives({
  recipientId, regionId, recipient, location,
}) {
  const showNewGoals = !!((location.state && location.state.ids && location.state.ids.length > 0));
  const yearToDate = formatDateRange({ yearToDate: true, forDateTime: true });

  const FILTER_KEY = 'goals-objectives-filters';

  const [filters, setFilters] = useSessionFiltersAndReflectInUrl(
    FILTER_KEY,
    [{
      id: uuidv4(),
      topic: 'createDate',
      condition: 'is within',
      query: yearToDate,
    }],
  );

  const possibleGrants = recipient.grants;

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
      condition: 'is',
      query: regionId,
    },
    {
      topic: 'recipientId',
      condition: 'contains',
      query: recipientId,
    },
  ];

  let hasActiveGrants = false;
  if (recipient.grants.find((g) => g.status === 'Active')) {
    hasActiveGrants = true;
  }

  return (
    <>
      <Helmet>
        <title>
          Goals and Objectives
        </title>
      </Helmet>
      <div className="margin-x-2 maxw-widescreen" id="recipientGoalsObjectives">
        <div className="display-flex flex-wrap margin-bottom-2" data-testid="filter-panel">
          <FilterPanel
            onRemoveFilter={onRemoveFilter}
            onApplyFilters={setFilters}
            filterConfig={getGoalsAndObjectivesFilterConfig(possibleGrants)}
            applyButtonAria="Apply filters to goals"
            filters={filters}
          />
        </div>
        <Grid row>
          <Grid desktop={{ col: 6 }} mobileLg={{ col: 12 }}>
            <GoalStatusGraph filters={filtersToApply} />
          </Grid>
        </Grid>
        <GoalsTable
          recipientId={recipientId}
          regionId={regionId}
          filters={expandFilters(filters)}
          hasActiveGrants={hasActiveGrants}
          showNewGoals={showNewGoals}
        />
      </div>
    </>
  );
}

GoalsObjectives.propTypes = {
  recipientId: PropTypes.string.isRequired,
  regionId: PropTypes.string.isRequired,
  recipient: PropTypes.shape({
    grants: PropTypes.arrayOf(PropTypes.shape({
      id: PropTypes.number.isRequired,
      numberWithProgramTypes: PropTypes.string.isRequired,
    })).isRequired,
  }).isRequired,
  location: ReactRouterPropTypes.location.isRequired,
};
