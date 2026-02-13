/* eslint-disable jsx-a11y/anchor-is-valid */
import React, { useState, useMemo, useEffect, useContext, memo } from 'react'
import { uniqueId } from 'lodash'
import PropTypes from 'prop-types'
import { Grid } from '@trussworks/react-uswds'
import useDeepCompareEffect from 'use-deep-compare-effect'
import { DECIMAL_BASE, GOAL_STATUS } from '@ttahub/common'
import { useHistory } from 'react-router-dom'
import { filtersToQueryString } from '../../utils'
import { GoalStatusChart } from '../../widgets/GoalStatusGraph'
import { GOALS_PER_PAGE } from '../../Constants'
import './GoalTable.scss'
import { getRecipientGoals } from '../../fetchers/recipient'
import AppLoadingContext from '../../AppLoadingContext'
import { getCommunicationLogsByRecipientId } from '../../fetchers/communicationLog'
import useSessionSort from '../../hooks/useSessionSort'
import FilterContext from '../../FilterContext'
import { GOALS_OBJECTIVES_FILTER_KEY } from '../../pages/RecipientRecord/pages/constants'
import RttapaUpdates from '../../widgets/RttapaUpdates'
import GoalCards from './GoalCards'

const COMMUNICATION_PURPOSES = ['RTTAPA updates', 'RTTAPA Initial Plan / New Recipient']
const COMMUNCATION_SORT = {
  sortBy: 'communicationDate',
  direction: 'desc',
  limit: 5,
  offset: 0,
}

const LOG_FILTERS = COMMUNICATION_PURPOSES.map((purpose) => ({
  id: uniqueId('log-filters'),
  display: '',
  topic: 'purpose',
  condition: 'is',
  query: [purpose],
}))

const Graph = memo(GoalStatusChart)

function GoalDataController({ filters, recipientId, regionId, hasActiveGrants, hasMissingStandardGoals, showNewGoals }) {
  // Goal Data.
  const [data, setData] = useState({
    statuses: {
      total: 0,
      [GOAL_STATUS.NOT_STARTED]: 0,
      [GOAL_STATUS.IN_PROGRESS]: 0,
      [GOAL_STATUS.CLOSED]: 0,
      [GOAL_STATUS.SUSPENDED]: 0,
    },
    rows: [],
    count: 0,
  })

  // Page Behavior.
  const [error, setError] = useState('')
  const [goalsPerPage, setGoalsPerPage] = useState(GOALS_PER_PAGE)
  const [logs, setLogs] = useState([])
  const [logsLoaded, setLogsLoaded] = useState(false)
  const { setIsAppLoading, isAppLoading } = useContext(AppLoadingContext)
  const [currentFilters, setCurrentFilters] = useState(filtersToQueryString(filters))
  const [cardsAreLoaded, setCardsAreLoaded] = useState(false)

  useEffect(() => {
    if (logsLoaded && cardsAreLoaded && isAppLoading) {
      setIsAppLoading(false)
    }
  }, [logsLoaded, setIsAppLoading, cardsAreLoaded, isAppLoading])

  const history = useHistory()

  const defaultSort = useMemo(
    () =>
      showNewGoals
        ? {
            sortBy: 'createdOn',
            direction: 'desc',
          }
        : {
            sortBy: 'goalStatus',
            direction: 'asc',
          },
    [showNewGoals]
  )

  // Grid and Paging.
  const [sortConfig, setSortConfig] = useSessionSort(
    {
      ...defaultSort,
      activePage: 1,
      offset: 0,
    },
    `goalsTable/${recipientId}/${regionId}`
  )

  useEffect(() => {
    async function fetchLogs() {
      try {
        setIsAppLoading(true)
        setError(null)
        const { rows } = await getCommunicationLogsByRecipientId(
          String(regionId),
          String(recipientId),
          COMMUNCATION_SORT.sortBy,
          COMMUNCATION_SORT.direction,
          COMMUNCATION_SORT.offset,
          COMMUNCATION_SORT.limit,
          LOG_FILTERS
        )

        setLogs(rows)
      } catch (err) {
        setError('Error fetching communication logs')
      } finally {
        setLogsLoaded(true)
      }
    }
    fetchLogs()
  }, [recipientId, regionId, setIsAppLoading])

  useDeepCompareEffect(() => {
    async function fetchGoals(query) {
      try {
        setCardsAreLoaded(false)

        const { sortBy } = sortConfig
        const response = await getRecipientGoals(recipientId, regionId, sortBy, sortConfig.direction, sortConfig.offset, goalsPerPage, query, [])

        const rolledUpGoalIds = response.allGoalIds.map((goal) => goal.id)
        const goalBuckets = response.allGoalIds
        setData({ ...response, allGoalIds: rolledUpGoalIds, goalBuckets })

        setError('')
      } catch (e) {
        setError('Unable to fetch goals')
      } finally {
        setCardsAreLoaded(true)
      }
    }
    const filterQuery = filtersToQueryString(filters)

    // If filters is different from currentFilters, then reset the activePage and Offset.
    if (filterQuery !== currentFilters) {
      setSortConfig({
        ...sortConfig,
        activePage: 1,
        offset: 0,
      })
      setCurrentFilters(filterQuery)
    }

    fetchGoals(filterQuery)
  }, [sortConfig, filters, recipientId, regionId, showNewGoals, setSortConfig, goalsPerPage, setIsAppLoading, history.location])

  const handlePageChange = (pageNumber) => {
    setCardsAreLoaded(true)
    setSortConfig({
      ...sortConfig,
      activePage: pageNumber,
      offset: (pageNumber - 1) * goalsPerPage,
    })
  }

  const requestSort = (sortBy, direction) => {
    setCardsAreLoaded(true)
    setSortConfig({
      ...sortConfig,
      sortBy,
      direction,
      activePage: 1,
      offset: 0,
    })
  }

  const perPageChange = (e) => {
    setCardsAreLoaded(true)
    const perPageValue = parseInt(e.target.value, DECIMAL_BASE)
    setSortConfig({
      ...sortConfig,
      activePage: 1,
      offset: 0,
    })
    setGoalsPerPage(perPageValue)
  }

  const displayGoals = useMemo(() => (data.goalRows && data.goalRows.length ? data.goalRows : []), [data.goalRows])

  return (
    <div>
      <Grid gap={5} row>
        <Grid desktop={{ col: 6 }} mobileLg={{ col: 12 }}>
          <Graph data={data.statuses} />
        </Grid>
        <Grid desktop={{ col: 6 }} mobileLg={{ col: 12 }}>
          <RttapaUpdates recipientId={recipientId} regionId={regionId} logs={logs} />
        </Grid>
      </Grid>
      <FilterContext.Provider value={{ filterKey: GOALS_OBJECTIVES_FILTER_KEY(recipientId) }}>
        <GoalCards
          recipientId={recipientId}
          regionId={regionId}
          filters={filters}
          hasActiveGrants={hasActiveGrants}
          hasMissingStandardGoals={hasMissingStandardGoals}
          showNewGoals={showNewGoals || false}
          goals={displayGoals}
          error={error}
          goalsCount={data.count}
          allGoalIds={data.allGoalIds}
          handlePageChange={handlePageChange}
          requestSort={requestSort}
          sortConfig={sortConfig}
          perPage={goalsPerPage}
          perPageChange={perPageChange}
          loading={!cardsAreLoaded}
        />
      </FilterContext.Provider>
    </div>
  )
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
    })
  ).isRequired,
  hasActiveGrants: PropTypes.bool.isRequired,
  hasMissingStandardGoals: PropTypes.bool.isRequired,
  showNewGoals: PropTypes.bool.isRequired,
}

export default GoalDataController
