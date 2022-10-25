/* eslint-disable jsx-a11y/anchor-is-valid */
import React, {
  useState,
  useMemo,
  useEffect,
  useRef,
  memo,
} from 'react';
import PropTypes from 'prop-types';
import { Grid } from '@trussworks/react-uswds';
import { filtersToQueryString } from '../../utils';
import GoalsTable from './GoalCards';
import { GoalStatusChart } from '../../widgets/GoalStatusGraph';
import { GOALS_PER_PAGE } from '../../Constants';
import './GoalTable.scss';
import { getRecipientGoals } from '../../fetchers/recipient';

import useSessionSort from '../../hooks/useSessionSort';
import FilterContext from '../../FilterContext';

import { GOALS_OBJECTIVES_FILTER_KEY } from '../../pages/RecipientRecord/pages/constants';

const Graph = memo(GoalStatusChart);

function GoalDataController({
  filters,
  recipientId,
  regionId,
  hasActiveGrants,
  showNewGoals,
}) {
  // Goal Data.
  const [data, setData] = useState({
    statuses: {
      total: 0,
      'Not started': 0,
      'In progress': 0,
      Closed: 0,
      Suspended: 0,
    },
    rows: [],
    count: 0,
  });

  const queryString = useRef(filtersToQueryString(filters));

  // Page Behavior.
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const defaultSort = showNewGoals
    ? {
      sortBy: 'createdOn',
      direction: 'desc',
    }
    : {
      sortBy: 'goalStatus',
      direction: 'asc',
    };

  // Grid and Paging.
  const [sortConfig, setSortConfig] = useSessionSort({
    ...defaultSort,
    activePage: 1,
    offset: 0,
  }, `goalsTable/${recipientId}/${regionId}`);

  useEffect(() => {
    async function fetchGoals(query) {
      setLoading(true);
      try {
        const response = await getRecipientGoals(
          recipientId,
          regionId,
          sortConfig.sortBy,
          sortConfig.direction,
          sortConfig.offset,
          GOALS_PER_PAGE,
          query,
        );
        setData(response);
        setError('');
      } catch (e) {
        setError('Unable to fetch goals');
      } finally {
        setLoading(false);
      }
    }
    const filterQuery = filtersToQueryString(filters);
    if (filterQuery !== queryString.current) {
      setSortConfig({ ...sortConfig, activePage: 1, offset: 0 });
      queryString.current = filterQuery;
      return;
    }
    fetchGoals(filterQuery);
  }, [sortConfig, filters, recipientId, regionId, showNewGoals, setSortConfig]);

  const handlePageChange = (pageNumber) => {
    setSortConfig({
      ...sortConfig, activePage: pageNumber, offset: (pageNumber - 1) * GOALS_PER_PAGE,
    });
  };

  const requestSort = (sortBy) => {
    let direction = 'asc';
    if (
      sortConfig
      && sortConfig.sortBy === sortBy
      && sortConfig.direction === 'asc'
    ) {
      direction = 'desc';
    }
    setSortConfig({
      ...sortConfig, sortBy, direction, activePage: 1, offset: 0,
    });
  };

  const displayGoals = useMemo(() => (
    data.goalRows && data.goalRows.length ? data.goalRows : []),
  [data.goalRows]);

  const setGoals = (goals) => setData({ ...data, goalRows: goals });

  return (
    <div>
      <Grid row>
        <Grid desktop={{ col: 6 }} mobileLg={{ col: 12 }}>
          <Graph data={data.statuses} loading={loading} />
        </Grid>
      </Grid>
      <FilterContext.Provider value={{ filterKey: GOALS_OBJECTIVES_FILTER_KEY }}>
        <GoalsTable
          recipientId={recipientId}
          regionId={regionId}
          filters={filters}
          hasActiveGrants={hasActiveGrants}
          showNewGoals={showNewGoals || false}
          goals={displayGoals}
          error={error}
          goalsCount={data.count}
          allGoalIds={data.allGoalIds}
          handlePageChange={handlePageChange}
          requestSort={requestSort}
          sortConfig={sortConfig}
          setGoals={setGoals}
          loading={loading}
        />
      </FilterContext.Provider>
    </div>

  );
}
GoalDataController.propTypes = {
  recipientId: PropTypes.string.isRequired,
  regionId: PropTypes.string.isRequired,
  filters: PropTypes.arrayOf(
    PropTypes.shape({
      condition: PropTypes.string,
      id: PropTypes.string,
      query: PropTypes.string,
      topic: PropTypes.string,
    }),
  ).isRequired,
  hasActiveGrants: PropTypes.bool.isRequired,
  showNewGoals: PropTypes.bool.isRequired,
};

export default GoalDataController;
