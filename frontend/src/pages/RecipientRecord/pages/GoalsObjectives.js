import React, { useContext, useMemo } from 'react';
import PropTypes from 'prop-types';
import { Helmet } from 'react-helmet';
import ReactRouterPropTypes from 'react-router-prop-types';
import useSessionFiltersAndReflectInUrl from '../../../hooks/useSessionFiltersAndReflectInUrl';
import FilterPanel from '../../../components/filter/FilterPanel';
import { expandFilters } from '../../../utils';
import { getGoalsAndObjectivesFilterConfig, GOALS_OBJECTIVES_FILTER_KEY } from './constants';
import UserContext from '../../../UserContext';
import { getUserRegions } from '../../../permissions';
import GoalDataController from '../../../components/GoalCards/GoalDataController';

export default function GoalsObjectives({
  recipientId,
  regionId,
  recipient,
  location,
  recipientName,
  canMergeGoals,
}) {
  const { user } = useContext(UserContext);
  const regions = useMemo(() => getUserRegions(user), [user]);
  const showNewGoals = location.state && location.state.ids && location.state.ids.length > 0;

  const [filters, setFilters] = useSessionFiltersAndReflectInUrl(
    GOALS_OBJECTIVES_FILTER_KEY(recipientId),
    [],
  );

  const possibleGrants = recipient.grants;

  const onRemoveFilter = (id) => {
    const newFilters = [...filters];
    const index = newFilters.findIndex((item) => item.id === id);
    newFilters.splice(index, 1);
    setFilters(newFilters);
  };

  const filtersToApply = expandFilters(filters);

  let hasActiveGrants = false;
  if (recipient.grants.find((g) => g.status === 'Active')) {
    hasActiveGrants = true;
  }

  return (
    <>
      <Helmet>
        <title>
          RTTAPA Goals and Objectives -
          {' '}
          {recipientName}
        </title>
      </Helmet>
      <div className="maxw-widescreen" id="recipientGoalsObjectives">
        <div className="display-flex display-flex flex-wrap flex-align-center flex-gap-1 margin-bottom-2" data-testid="filter-panel">
          <FilterPanel
            onRemoveFilter={onRemoveFilter}
            onApplyFilters={setFilters}
            filterConfig={getGoalsAndObjectivesFilterConfig(possibleGrants)}
            applyButtonAria="Apply filters to goals"
            filters={filters}
            allUserRegions={regions}
          />
        </div>
        <GoalDataController
          filters={filtersToApply}
          recipientId={recipientId}
          regionId={regionId}
          hasActiveGrants={hasActiveGrants}
          showNewGoals={showNewGoals || false}
          canMergeGoals={canMergeGoals}
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
  recipientName: PropTypes.string,
  canMergeGoals: PropTypes.bool.isRequired,
};

GoalsObjectives.defaultProps = {
  recipientName: '',
};
