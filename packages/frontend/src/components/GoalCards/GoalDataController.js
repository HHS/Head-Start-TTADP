/* eslint-disable jsx-a11y/anchor-is-valid */
import React, {
  useState,
  useMemo,
  useEffect,
  useContext,
  memo,
} from 'react';
import { uniqueId } from 'lodash';
import PropTypes from 'prop-types';
import { Grid } from '@trussworks/react-uswds';
import useDeepCompareEffect from 'use-deep-compare-effect';
import { DECIMAL_BASE } from '@ttahub/common';
import { useHistory } from 'react-router-dom';
import { filtersToQueryString } from '../../utils';
import GoalsTable from './GoalCards';
import { GoalStatusChart } from '../../widgets/GoalStatusGraph';
import { GOALS_PER_PAGE } from '../../Constants';
import './GoalTable.scss';
import { getRecipientGoals } from '../../fetchers/recipient';
import AppLoadingContext from '../../AppLoadingContext';
import { getCommunicationLogsByRecipientId } from '../../fetchers/communicationLog';
import useSessionSort from '../../hooks/useSessionSort';
import FilterContext from '../../FilterContext';
import { GOALS_OBJECTIVES_FILTER_KEY } from '../../pages/RecipientRecord/pages/constants';
import RttapaUpdates from '../../widgets/RttapaUpdates';

const COMMUNICATION_PURPOSES = ['RTTAPA updates', 'RTTAPA Initial Plan / New Recipient'];
const COMMUNCATION_SORT = {
  sortBy: 'communicationDate',
  direction: 'desc',
  limit: 5,
  offset: 0,
};

const LOG_FILTERS = COMMUNICATION_PURPOSES.map((purpose) => ({
  id: uniqueId('log-filters'),
  display: '',
  topic: 'purpose',
  condition: 'is',
  query: [purpose],
}));

const Graph = memo(GoalStatusChart);

function GoalDataController({
  filters,
  recipientId,
  regionId,
  hasActiveGrants,
  showNewGoals,
  canMergeGoals,
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

  // Page Behavior.
  const [error, setError] = useState('');
  const [goalsPerPage, setGoalsPerPage] = useState(GOALS_PER_PAGE);
  const [shouldDisplayMergeSuccess, setShouldDisplayMergedSuccess] = useState(false);
  const [logs, setLogs] = useState([]);
  const [logsLoaded, setLogsLoaded] = useState(false);
  const { setIsAppLoading, isAppLoading } = useContext(AppLoadingContext);
  const [currentFilters, setCurrentFilters] = useState(filtersToQueryString(filters));

  useEffect(() => {
    let isLoaded = false;

    if (logsLoaded) {
      isLoaded = true;
    }

    if (!isLoaded !== isAppLoading) {
      setIsAppLoading(!isLoaded);
    }
  }, [isAppLoading, logsLoaded, setIsAppLoading]);

  const history = useHistory();

  const defaultSort = useMemo(() => (showNewGoals
    ? {
      sortBy: 'createdOn',
      direction: 'desc',
    }
    : {
      sortBy: 'goalStatus',
      direction: 'asc',
    }), [showNewGoals]);

  // Grid and Paging.
  const [sortConfig, setSortConfig] = useSessionSort({
    ...defaultSort,
    activePage: 1,
    offset: 0,
  }, `goalsTable/${recipientId}/${regionId}`);

  useDeepCompareEffect(() => {
    async function fetchGoals(query) {
      try {
        setIsAppLoading(true);
        const mergedGoals = (() => {
          if (history.location && history.location.state) {
            return history.location.state.mergedGoals;
          }

          return null;
        })();

        let { sortBy } = sortConfig;

        if (mergedGoals) {
          sortBy = 'mergedGoals';
        }

        const response = await getRecipientGoals(
          recipientId,
          regionId,
          sortBy,
          sortConfig.direction,
          sortConfig.offset,
          goalsPerPage,
          query,
          mergedGoals || [],
        );
        const rolledUpGoalIds = response.allGoalIds.map((goal) => goal.id);
        const goalBuckets = response.allGoalIds;
        setData({ ...response, allGoalIds: rolledUpGoalIds, goalBuckets });
        setError('');
        // display success message if we have merged goals
        setShouldDisplayMergedSuccess((mergedGoals && mergedGoals.length > 0));
      } catch (e) {
        setError('Unable to fetch goals');
      } finally {
        setIsAppLoading(false);
      }
    }
    const filterQuery = filtersToQueryString(filters);

    // If filters is different from currentFilters, then reset the activePage and Offset.
    if (filterQuery !== currentFilters) {
      setSortConfig({
        ...sortConfig,
        activePage: 1,
        offset: 0,
      });
      setCurrentFilters(filterQuery);
    }

    fetchGoals(filterQuery);
  }, [
    sortConfig,
    filters,
    recipientId,
    regionId,
    showNewGoals,
    setSortConfig,
    goalsPerPage,
    setIsAppLoading,
    history.location,
  ]);

  useEffect(() => {
    async function fetchLogs() {
      try {
        setError(null);
        const { rows } = await getCommunicationLogsByRecipientId(
          String(regionId),
          String(recipientId),
          COMMUNCATION_SORT.sortBy,
          COMMUNCATION_SORT.direction,
          COMMUNCATION_SORT.offset,
          COMMUNCATION_SORT.limit,
          LOG_FILTERS,
        );

        setLogs(rows);
      } catch (err) {
        setError('Error fetching communication logs');
      } finally {
        setLogsLoaded(true);
      }
    }
    fetchLogs();
  }, [
    recipientId,
    regionId,
  ]);

  const handlePageChange = (pageNumber) => {
    setSortConfig({
      ...sortConfig, activePage: pageNumber, offset: (pageNumber - 1) * goalsPerPage,
    });
  };

  const requestSort = (sortBy, direction) => {
    setSortConfig({
      ...sortConfig, sortBy, direction, activePage: 1, offset: 0,
    });
  };

  const perPageChange = (e) => {
    const perPageValue = parseInt(e.target.value, DECIMAL_BASE);
    setSortConfig({
      ...sortConfig,
      activePage: 1,
      offset: 0,
    });
    setGoalsPerPage(perPageValue);
  };

  const displayGoals = useMemo(() => (
    data.goalRows && data.goalRows.length ? data.goalRows : []),
  [data.goalRows]);

  const setGoals = (goals) => setData({ ...data, goalRows: goals });

  const dismissMergeSuccess = () => {
    if (history.location.state && history.location.state.mergedGoals) {
      history.location.state.mergedGoals = null;
    }

    setSortConfig({
      ...defaultSort,
      activePage: 1,
      offset: 0,
    });

    setShouldDisplayMergedSuccess(false);
  };

  return (
    <div>
      <Grid gap={5} row>
        <Grid desktop={{ col: 6 }} mobileLg={{ col: 12 }}>
          <Graph data={data.statuses} />
        </Grid>
        <Grid desktop={{ col: 6 }} mobileLg={{ col: 12 }}>
          <RttapaUpdates
            recipientId={recipientId}
            regionId={regionId}
            logs={logs}
          />
        </Grid>
      </Grid>
      <FilterContext.Provider value={{ filterKey: GOALS_OBJECTIVES_FILTER_KEY(recipientId) }}>
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
          perPage={goalsPerPage}
          perPageChange={perPageChange}
          canMergeGoals={canMergeGoals}
          shouldDisplayMergeSuccess={shouldDisplayMergeSuccess}
          dismissMergeSuccess={dismissMergeSuccess}
          goalBuckets={data.goalBuckets}
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
  canMergeGoals: PropTypes.bool.isRequired,
};

export default GoalDataController;
