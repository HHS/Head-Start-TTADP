import React, { useContext, useMemo, useCallback } from 'react'
import PropTypes from 'prop-types'
import { Helmet } from 'react-helmet'
import ReactRouterPropTypes from 'react-router-prop-types'
import useSessionFiltersAndReflectInUrl from '../../../hooks/useSessionFiltersAndReflectInUrl'
import FilterPanel from '../../../components/filter/FilterPanel'
import { expandFilters } from '../../../utils'
import { getGoalsAndObjectivesFilterConfig, GOALS_OBJECTIVES_FILTER_KEY } from './constants'
import UserContext from '../../../UserContext'
import { getUserRegions } from '../../../permissions'
import GoalDataController from '../../../components/GoalCards/GoalDataController'

export default function GoalsObjectives({ recipientId, regionId, recipient, location }) {
  const { user } = useContext(UserContext)
  const regions = useMemo(() => getUserRegions(user), [user])
  const showNewGoals = location.state && location.state.ids && location.state.ids.length > 0

  const [filters, setFilters] = useSessionFiltersAndReflectInUrl(GOALS_OBJECTIVES_FILTER_KEY(recipientId), [])

  const possibleGrants = recipient.grants

  const onRemoveFilter = useCallback(
    (id) => {
      const newFilters = [...filters]
      const index = newFilters.findIndex((item) => item.id === id)
      newFilters.splice(index, 1)
      setFilters(newFilters)
    },
    [filters, setFilters]
  )

  const filtersToApply = useMemo(() => expandFilters(filters), [filters])
  const hasActiveGrants = useMemo(() => {
    if (recipient.grants && recipient.grants.find((g) => g.status === 'Active')) {
      return true
    }

    return false
  }, [recipient.grants])

  const hasMissingStandardGoals = useMemo(() => {
    if (recipient.missingStandardGoals && recipient.missingStandardGoals.length > 0) {
      return true
    }

    return false
  }, [recipient.missingStandardGoals])

  return (
    <>
      <Helmet>
        <title>RTTAPA</title>
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
          hasMissingStandardGoals={hasMissingStandardGoals}
          showNewGoals={showNewGoals || false}
        />
      </div>
    </>
  )
}

GoalsObjectives.propTypes = {
  recipientId: PropTypes.string.isRequired,
  regionId: PropTypes.string.isRequired,
  recipient: PropTypes.shape({
    grants: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.number.isRequired,
        numberWithProgramTypes: PropTypes.string.isRequired,
      })
    ),
    missingStandardGoals: PropTypes.arrayOf(
      PropTypes.shape({
        goalTemplateId: PropTypes.number.isRequired,
        templateName: PropTypes.string.isRequired,
        grantId: PropTypes.number.isRequired,
      })
    ),
  }).isRequired,
  location: ReactRouterPropTypes.location.isRequired,
}
