import React, { useContext } from 'react'
import PropTypes from 'prop-types'
import { DECIMAL_BASE } from '@ttahub/common'
import { Checkbox, Button, Dropdown, Alert } from '@trussworks/react-uswds'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus, faTimesCircle } from '@fortawesome/free-solid-svg-icons'
import { Link, useHistory } from 'react-router-dom'
import UserContext from '../../UserContext'
import { canEditOrCreateGoals } from '../../permissions'
import colors from '../../colors'
import PaginationCard from '../PaginationCard'
import './GoalsCardsHeader.css'

export default function GoalCardsHeader({
  title,
  count,
  recipientId,
  regionId,
  hasActiveGrants,
  hasMissingStandardGoals,
  sortConfig,
  requestSort,
  numberOfSelectedGoals,
  allGoalsChecked,
  selectAllGoalCheckboxSelect,
  selectAllGoals,
  pageSelectedGoalIds,
  pageGoalIds,
  activePage,
  offset,
  perPage,
  handlePageChange,
  perPageChange,
  allSelectedGoalIds,
}) {
  const history = useHistory()
  const { user } = useContext(UserContext)
  const hasButtonPermissions = canEditOrCreateGoals(user, parseInt(regionId, DECIMAL_BASE))
  const showAddNewButton = hasActiveGrants && hasButtonPermissions && hasMissingStandardGoals
  const onPrint = () => {
    // See if we have goals selected.
    let goalsToPrint = Object.keys(allSelectedGoalIds)
      .filter((key) => allSelectedGoalIds[key])
      .map((key) => parseInt(key, DECIMAL_BASE))

    // If we don't just print the page.
    if (!goalsToPrint.length) {
      goalsToPrint = pageGoalIds
    }

    history.push(`/recipient-tta-records/${recipientId}/region/${regionId}/rttapa/print${window.location.search}`, {
      sortConfig,
      selectedGoalIds: goalsToPrint,
    })
  }
  const setSortBy = (e) => {
    const [sortBy, direction] = e.target.value.split('-')
    requestSort(sortBy, direction)
  }

  const hasGoalsSelected = pageSelectedGoalIds ? pageSelectedGoalIds.length > 0 : false
  const showClearAllAlert = numberOfSelectedGoals === count

  return (
    <div className="ttahub-goal-cards-header padding-x-3 position-relative">
      <div className="desktop:display-flex flex-1 desktop:padding-top-0 padding-top-2 bg-white margin-y-1 desktop:margin-0">
        <h2 className="font-body-lg desktop:margin-left-2 margin-right-1 desktop:margin-y-3">{title}</h2>
        {showAddNewButton ? (
          <span className="smart-hub--table-controls desktop:margin-x-2 desktop:margin-y-0 display-flex flex-row flex-align-center">
            <Link to={`/recipient-tta-records/${recipientId}/region/${regionId}/goals/new`} className="display-flex flex-justify usa-button">
              <FontAwesomeIcon color="white" icon={faPlus} />
              <span className="margin-x-1">Add new goals</span>
            </Link>
          </span>
        ) : null}
      </div>
      <div className="ttahub-goal-cards-header--sort-and-pagination">
        <div className="desktop:display-flex flex-align-center">
          {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
          <label className="display-block margin-right-1" style={{ minWidth: 'max-content' }} htmlFor="sortBy">
            Sort by
          </label>
          <Dropdown
            onChange={setSortBy}
            value={`${sortConfig.sortBy}-${sortConfig.direction}`}
            className="margin-top-0"
            id="sortBy"
            name="sortBy"
            data-testid="sortGoalsBy"
          >
            <option value="createdOn-desc">creation date (newest to oldest) </option>
            <option value="createdOn-asc">creation date (oldest to newest) </option>
            <option value="goalStatus-asc">goal status (not started first)</option>
            <option value="goalStatus-desc">goal status (closed first) </option>
            <option value="name-asc">goal (a-z)</option>
            <option value="name-desc">goal (z-a)</option>
          </Dropdown>
        </div>
        <PaginationCard
          totalCount={count}
          currentPage={activePage}
          offset={offset}
          perPage={perPage}
          handlePageChange={handlePageChange}
          accessibleLandmarkName="Goals pagination"
          paginationClassName="padding-x-1 margin-0"
          perPageChange={perPageChange}
        />
      </div>
      <hr className="border-1px border-base-lighter  bg-base-lighter margin-y-3" />
      <div className="margin-left-3 display-flex flex-row flex-align-center position-sticky top-0 bg-white" style={{ zIndex: 2 }}>
        <Checkbox
          label="Select all"
          id="select-all-goal-checkboxes"
          aria-label="deselect all goals"
          checked={allGoalsChecked}
          onChange={selectAllGoalCheckboxSelect}
        />
        {numberOfSelectedGoals > 0 && (
          <span className="filter-pill-container smart-hub-border-blue-primary border-2px margin-left-2 margin-right-1 radius-pill padding-right-1 padding-left-2 padding-y-05">
            <span>{numberOfSelectedGoals} selected </span>
            <Button
              className="smart-hub--select-tag__button"
              unstyled
              aria-label="deselect all goals"
              onClick={() => {
                selectAllGoalCheckboxSelect({ target: { checked: false } })
              }}
            >
              <FontAwesomeIcon className="margin-left-1 margin-top-2px filter-pills-cursor" color={colors.ttahubMediumBlue} icon={faTimesCircle} />
            </Button>
          </span>
        )}
        <Button unstyled className="display-flex flex-align-center margin-left-3 margin-y-0" onClick={onPrint}>
          {`Preview and print ${hasGoalsSelected ? 'selected' : ''}`}
        </Button>
      </div>
      <div>
        {allGoalsChecked ? (
          <Alert className="margin-top-3" type="info" slim>
            {showClearAllAlert ? `All ${count} goals are selected.` : `All ${pageSelectedGoalIds.length} goals on this page are selected.`}
            <button type="button" className="usa-button usa-button--unstyled margin-left-1" onClick={() => selectAllGoals(showClearAllAlert)}>
              {showClearAllAlert ? 'Clear selection' : `Select all ${count} goals`}
            </button>
          </Alert>
        ) : null}
      </div>
    </div>
  )
}

GoalCardsHeader.propTypes = {
  title: PropTypes.string.isRequired,
  count: PropTypes.number,
  regionId: PropTypes.string.isRequired,
  recipientId: PropTypes.string.isRequired,
  hasActiveGrants: PropTypes.bool.isRequired,
  hasMissingStandardGoals: PropTypes.bool.isRequired,
  requestSort: PropTypes.func.isRequired,
  sortConfig: PropTypes.shape({
    sortBy: PropTypes.string,
    direction: PropTypes.string,
    activePage: PropTypes.number,
    offset: PropTypes.number,
  }).isRequired,
  selectAllGoalCheckboxSelect: PropTypes.func,
  allGoalsChecked: PropTypes.bool,
  numberOfSelectedGoals: PropTypes.number,
  selectAllGoals: PropTypes.func,
  pageGoalIds: PropTypes.arrayOf(PropTypes.number).isRequired,
  activePage: PropTypes.number.isRequired,
  offset: PropTypes.number.isRequired,
  perPage: PropTypes.number.isRequired,
  handlePageChange: PropTypes.func.isRequired,
  pageSelectedGoalIds: PropTypes.arrayOf(PropTypes.number).isRequired,
  allSelectedGoalIds: PropTypes.shape({ id: PropTypes.bool }).isRequired,
  perPageChange: PropTypes.func.isRequired,
}

GoalCardsHeader.defaultProps = {
  allGoalsChecked: false,
  count: 0,
  selectAllGoalCheckboxSelect: () => {},
  selectAllGoals: () => {},
  numberOfSelectedGoals: 0,
}
