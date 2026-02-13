/* eslint-disable jsx-a11y/anchor-is-valid */
import React, { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import { Grid, Alert } from '@trussworks/react-uswds'
import { DECIMAL_BASE } from '@ttahub/common'
import GoalsCardsHeader from './GoalsCardsHeader'
import Container from '../Container'
import { parseCheckboxEvent } from '../../Constants'
import StandardGoalCard from './StandardGoalCard'

function GoalCards({
  recipientId,
  regionId,
  hasActiveGrants,
  hasMissingStandardGoals,
  goals,
  error,
  goalsCount,
  handlePageChange,
  requestSort,
  loading,
  sortConfig,
  allGoalIds,
  perPage,
  perPageChange,
}) {
  // Goal select check boxes.
  const [selectedGoalCheckBoxes, setSelectedGoalCheckBoxes] = useState({})
  const [allGoalsChecked, setAllGoalsChecked] = useState(false)

  const makeGoalCheckboxes = (goalsArr, checked) => goalsArr.reduce((obj, g) => ({ ...obj, [g.id]: checked }), {})

  const selectAllGoalCheckboxSelect = (event) => {
    const { checked } = parseCheckboxEvent(event)

    // Preserve checked goals on other pages.
    const thisPagesGoalIds = goals.map((g) => g.id)
    const preservedCheckboxes = Object.keys(selectedGoalCheckBoxes).reduce((obj, key) => {
      if (!thisPagesGoalIds.includes(parseInt(key, DECIMAL_BASE))) {
        return { ...obj, [key]: selectedGoalCheckBoxes[key] }
      }
      return { ...obj }
    }, {})

    if (checked === true) {
      setSelectedGoalCheckBoxes({ ...makeGoalCheckboxes(goals, true), ...preservedCheckboxes })
    } else {
      setSelectedGoalCheckBoxes({ ...makeGoalCheckboxes(goals, false), ...preservedCheckboxes })
    }
  }

  // Check if all goals on the page are checked.
  useEffect(() => {
    const goalIds = goals.map((g) => g.id)
    const countOfCheckedOnThisPage = goalIds.filter((id) => selectedGoalCheckBoxes[id]).length
    if (goals.length === countOfCheckedOnThisPage) {
      setAllGoalsChecked(true)
    } else {
      setAllGoalsChecked(false)
    }
  }, [goals, selectedGoalCheckBoxes])

  const handleGoalCheckboxSelect = (event) => {
    const { checked, value } = parseCheckboxEvent(event)
    if (checked === true) {
      setSelectedGoalCheckBoxes({ ...selectedGoalCheckBoxes, [value]: true })
    } else {
      setSelectedGoalCheckBoxes({ ...selectedGoalCheckBoxes, [value]: false })
    }
  }

  const checkAllGoals = (isClear) => {
    const allIdCheckBoxes = allGoalIds.reduce((obj, g) => ({ ...obj, [g]: !isClear }), {})
    setSelectedGoalCheckBoxes(allIdCheckBoxes)
  }

  const numberOfSelectedGoals = Object.values(selectedGoalCheckBoxes).filter((g) => g).length

  const selectedCheckBoxes = Object.keys(selectedGoalCheckBoxes).filter((g) => selectedGoalCheckBoxes[g])

  const selectedGoalIdsButNumerical = selectedCheckBoxes.map((id) => parseInt(id, DECIMAL_BASE))
  const draftSelectedRttapa = goals.filter((g) => selectedGoalIdsButNumerical.includes(g.id) && g.goalStatus === 'Draft').map((g) => g.id)

  const allSelectedPageGoalIds = (() => {
    const selection = goals.filter((g) => selectedGoalCheckBoxes[g.id])
    return selection.map((g) => g.id)
  })()

  return (
    <>
      {error && (
        <Grid row>
          <Alert type="error" role="alert">
            {error}
          </Alert>
        </Grid>
      )}
      <Container
        className="goals-table maxw-full position-relative padding-bottom-2"
        paddingX={0}
        paddingY={0}
        positionRelative
        loading={loading}
        loadingLabel="Goals table loading"
      >
        <GoalsCardsHeader
          title="TTA goals and objectives"
          count={goalsCount || 0}
          activePage={sortConfig.activePage}
          offset={sortConfig.offset}
          perPage={perPage}
          handlePageChange={handlePageChange}
          recipientId={recipientId}
          regionId={regionId}
          hasActiveGrants={hasActiveGrants}
          hasMissingStandardGoals={hasMissingStandardGoals}
          sortConfig={sortConfig}
          requestSort={requestSort}
          numberOfSelectedGoals={numberOfSelectedGoals}
          allGoalsChecked={allGoalsChecked}
          selectAllGoalCheckboxSelect={selectAllGoalCheckboxSelect}
          selectAllGoals={checkAllGoals}
          pageSelectedGoalIds={allSelectedPageGoalIds}
          perPageChange={perPageChange}
          pageGoalIds={goals.map((g) => g.id)}
          draftSelectedRttapa={draftSelectedRttapa}
          allSelectedGoalIds={selectedGoalCheckBoxes}
        />
        <div className="padding-x-3 padding-y-2 ttahub-goal-cards">
          {goals.map((goal, index) => (
            <StandardGoalCard
              key={`goal-row-${goal.id}`}
              goal={goal}
              openMenuUp={index >= goals.length - 2 && index !== 0} // the last two should open "up"
              recipientId={recipientId}
              regionId={regionId}
              handleGoalCheckboxSelect={handleGoalCheckboxSelect}
              isChecked={selectedGoalCheckBoxes[goal.id] || false}
            />
          ))}
        </div>
      </Container>
    </>
  )
}
GoalCards.propTypes = {
  recipientId: PropTypes.string.isRequired,
  regionId: PropTypes.string.isRequired,
  hasActiveGrants: PropTypes.bool.isRequired,
  hasMissingStandardGoals: PropTypes.bool.isRequired,
  goals: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number,
    })
  ).isRequired,
  error: PropTypes.string,
  goalsCount: PropTypes.number.isRequired,
  handlePageChange: PropTypes.func.isRequired,
  requestSort: PropTypes.func.isRequired,
  loading: PropTypes.bool,
  sortConfig: PropTypes.shape({
    sortBy: PropTypes.string,
    direction: PropTypes.string,
    activePage: PropTypes.number,
    offset: PropTypes.number,
  }).isRequired,
  allGoalIds: PropTypes.arrayOf(PropTypes.number),
  perPage: PropTypes.number,
  perPageChange: PropTypes.func.isRequired,
}

GoalCards.defaultProps = {
  allGoalIds: [],
  perPage: 10,
  error: '',
  loading: false,
}
export default GoalCards
